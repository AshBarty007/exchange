// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Utils.sol";
import "./IAuth.sol";
import "./IAccount.sol";
import "./AccountStorage.sol";

/**
 * @title Account
 * @dev 主账户/子账户管理逻辑合约
 * @notice 数据全部存储在 AccountStorage，本合约可升级替换
 */
contract Account is IAccount {

    enum AccountType { NONE, MAIN, SUB }

    IAuth private _auth;
    AccountStorage private _store;

    uint256 public constant MAX_SUB_ACCOUNTS = 100;

    event MainAccountRegistered(address indexed account, bytes32 role, uint256 timestamp);
    event SubAccountCreated(address indexed subAccount, address indexed mainAccount, uint256 index, uint256 timestamp);
    event AccountDeactivated(address indexed account, uint256 timestamp);
    event AccountActivated(address indexed account, uint256 timestamp);
    event MetadataUpdated(address indexed account, string metadata);

    error AccountAlreadyRegistered(address account);
    error AccountNotRegistered(address account);
    error AccountNotActive(address account);
    error MaxSubAccountsReached(address mainAccount);
    error NotMainAccount(address account);
    error NotSubAccount(address account);
    error UnauthorizedOperation(address operator, address account);
    error SubAccountNotFound(address subAccount);

    constructor(address authContract, address accountStorage) {
        Utils.requireValidAddress(authContract);
        Utils.requireValidAddress(accountStorage);
        _auth = IAuth(authContract);
        _store = AccountStorage(accountStorage);
    }

    modifier onlyOwnerOrAdmin(address account) {
        if (msg.sender != account && !_auth.isAnyAdmin(msg.sender)) {
            revert UnauthorizedOperation(msg.sender, account);
        }
        _;
    }

    modifier notFrozen(address account) {
        require(!_auth.isFrozen(account), "Account is frozen");
        _;
    }

    // ==================== 内部辅助 ====================

    function _canCreateSubAccount(address account) internal view returns (bool) {
        return _auth.hasRole(_auth.SCENIC_OPERATOR_ROLE(), account) ||
               _auth.hasRole(_auth.MARKET_MAKER_ROLE(), account);
    }

    function _resolveSubAccountOwnerRole(address account) internal view returns (bytes32) {
        if (_auth.hasRole(_auth.SCENIC_OPERATOR_ROLE(), account)) {
            return _auth.SCENIC_OPERATOR_ROLE();
        }
        return _auth.MARKET_MAKER_ROLE();
    }

    function _ensureSubAccountOwnerInitialized(address mainAccount) internal {
        if (!_canCreateSubAccount(mainAccount)) {
            revert UnauthorizedOperation(msg.sender, mainAccount);
        }

        AccountStorage.AccountInfo memory info = _store.getAccount(mainAccount);

        if (info.accountType == AccountStorage.AccountType.SUB) {
            revert NotMainAccount(mainAccount);
        }

        if (info.accountType == AccountStorage.AccountType.NONE) {
            bytes32 role = _resolveSubAccountOwnerRole(mainAccount);
            _store.setAccount(mainAccount, AccountStorage.AccountInfo({
                accountType: AccountStorage.AccountType.MAIN,
                mainAccount: mainAccount,
                subAccounts: new address[](0),
                role: role,
                createdAt: block.timestamp,
                active: true,
                metadata: ""
            }));
            emit MainAccountRegistered(mainAccount, role, block.timestamp);
        }
    }

    // ==================== 公开接口 ====================

    function registerMainAccount(
        address account,
        bytes32 role,
        string memory metadata
    ) public returns (bool) {
        require(msg.sender == address(_auth), "Only Auth contract can register main account");
        Utils.requireValidAddress(account);

        AccountStorage.AccountInfo memory info = _store.getAccount(account);
        if (info.accountType != AccountStorage.AccountType.NONE) {
            revert AccountAlreadyRegistered(account);
        }

        _store.setAccount(account, AccountStorage.AccountInfo({
            accountType: AccountStorage.AccountType.MAIN,
            mainAccount: account,
            subAccounts: new address[](0),
            role: role,
            createdAt: block.timestamp,
            active: true,
            metadata: metadata
        }));

        emit MainAccountRegistered(account, role, block.timestamp);
        return true;
    }

    function createSubAccount(address mainAccount, string memory metadata)
        public
        notFrozen(mainAccount)
        returns (address)
    {
        Utils.requireValidAddress(mainAccount);

        if (msg.sender != mainAccount) {
            revert UnauthorizedOperation(msg.sender, mainAccount);
        }

        _ensureSubAccountOwnerInitialized(mainAccount);

        AccountStorage.AccountInfo memory mainInfo = _store.getAccount(mainAccount);
        if (!mainInfo.active) {
            revert AccountNotActive(mainAccount);
        }

        uint256 currentCount = _store.getSubAccountCount(mainAccount);
        if (currentCount >= MAX_SUB_ACCOUNTS) {
            revert MaxSubAccountsReached(mainAccount);
        }

        uint256 index = _store.getNextSubAccountIndex(mainAccount);
        address subAccount = _generateSubAccountAddress(mainAccount, index);

        _store.setAccount(subAccount, AccountStorage.AccountInfo({
            accountType: AccountStorage.AccountType.SUB,
            mainAccount: mainAccount,
            subAccounts: new address[](0),
            role: mainInfo.role,
            createdAt: block.timestamp,
            active: true,
            metadata: metadata
        }));

        _store.pushSubAccount(mainAccount, subAccount);

        emit SubAccountCreated(subAccount, mainAccount, index, block.timestamp);
        return subAccount;
    }

    function createSubAccount(string memory metadata) public returns (address) {
        return createSubAccount(msg.sender, metadata);
    }

    function batchCreateSubAccounts(
        address mainAccount,
        uint256 count,
        string memory metadata
    ) public notFrozen(mainAccount) returns (address[] memory) {
        if (msg.sender != mainAccount) {
            revert UnauthorizedOperation(msg.sender, mainAccount);
        }
        require(count > 0 && count <= 10, "Invalid count (1-10)");

        address[] memory newSubAccounts = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            newSubAccounts[i] = createSubAccount(mainAccount, metadata);
        }
        return newSubAccounts;
    }

    function deactivateAccount(address account) public onlyOwnerOrAdmin(account) {
        AccountStorage.AccountInfo memory info = _store.getAccount(account);
        if (info.accountType == AccountStorage.AccountType.NONE) {
            revert AccountNotRegistered(account);
        }
        _store.setAccountActive(account, false);
        emit AccountDeactivated(account, block.timestamp);
    }

    function activateAccount(address account) public onlyOwnerOrAdmin(account) {
        AccountStorage.AccountInfo memory info = _store.getAccount(account);
        if (info.accountType == AccountStorage.AccountType.NONE) {
            revert AccountNotRegistered(account);
        }
        _store.setAccountActive(account, true);
        emit AccountActivated(account, block.timestamp);
    }

    function updateMetadata(address account, string memory metadata) public onlyOwnerOrAdmin(account) {
        AccountStorage.AccountInfo memory info = _store.getAccount(account);
        if (info.accountType == AccountStorage.AccountType.NONE) {
            revert AccountNotRegistered(account);
        }
        _store.setAccountMetadata(account, metadata);
        emit MetadataUpdated(account, metadata);
    }

    // ==================== 查询接口 ====================

    function getAccountInfo(address account) public view returns (IAccount.AccountInfo memory) {
        AccountStorage.AccountInfo memory s = _store.getAccount(account);
        return IAccount.AccountInfo({
            accountType: uint8(s.accountType),
            mainAccount: s.mainAccount,
            subAccounts: s.subAccounts,
            role: s.role,
            createdAt: s.createdAt,
            active: s.active,
            metadata: s.metadata
        });
    }

    function getAccountType(address account) public view returns (AccountType) {
        return AccountType(uint8(_store.getAccountType(account)));
    }

    function isMainAccount(address account) public view returns (bool) {
        AccountStorage.AccountType t = _store.getAccountType(account);
        if (t == AccountStorage.AccountType.MAIN) return true;
        if (t == AccountStorage.AccountType.SUB) return false;
        return _canCreateSubAccount(account);
    }

    function isSubAccount(address account) public view returns (bool) {
        return _store.getAccountType(account) == AccountStorage.AccountType.SUB;
    }

    function getMainAccount(address account) public view returns (address) {
        AccountStorage.AccountInfo memory info = _store.getAccount(account);
        if (info.accountType == AccountStorage.AccountType.NONE) return account;
        return info.mainAccount;
    }

    function getSubAccounts(address mainAccount) public view returns (address[] memory) {
        return _store.getSubAccounts(mainAccount);
    }

    function getSubAccountCount(address mainAccount) public view returns (uint256) {
        return _store.getSubAccountCount(mainAccount);
    }

    function getSubAccountByIndex(address mainAccount, uint256 index) public view returns (address) {
        if (index >= _store.getSubAccountCount(mainAccount)) {
            revert SubAccountNotFound(address(0));
        }
        return _store.getSubAccountByIndex(mainAccount, index);
    }

    function isActive(address account) public view returns (bool) {
        return _store.isActive(account);
    }

    function verifySubAccountOwnership(address subAccount, address mainAccount) public view returns (bool) {
        if (_store.getAccountType(subAccount) != AccountStorage.AccountType.SUB) {
            return false;
        }
        return _store.getMainAccount(subAccount) == mainAccount;
    }

    function getAccountRole(address account) public view returns (bytes32) {
        return _store.getRole(account);
    }

    function getAccountMetadata(address account) public view returns (string memory) {
        return _store.getAccount(account).metadata;
    }

    function getAccountCreatedAt(address account) public view returns (uint256) {
        return _store.getAccount(account).createdAt;
    }

    function batchGetAccountInfo(address[] memory accounts) public view returns (IAccount.AccountInfo[] memory) {
        IAccount.AccountInfo[] memory infos = new IAccount.AccountInfo[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            infos[i] = getAccountInfo(accounts[i]);
        }
        return infos;
    }

    // ==================== 内部工具 ====================

    /**
     * @dev 生成子账户地址
     * @param mainAccount 主账户地址
     * @param index 子账户索引
     * @return 生成的子账户地址
     *
     * 安全改进：使用 blockhash(block.number - 1) 替代 block.timestamp
     * - blockhash 比 timestamp 更难被矿工操控
     * - 结合 mainAccount + index + blockhash + block.number + 合约地址，确保唯一性
     * - 注意：blockhash 只能获取最近 256 个区块，超出范围返回 0
     */
    function _generateSubAccountAddress(address mainAccount, uint256 index)
        internal
        view
        returns (address)
    {
        // 获取上一个区块的哈希（比 block.timestamp 更安全）
        bytes32 blockHash = blockhash(block.number - 1);

        // 如果 blockhash 返回 0（超出 256 区块范围），回退到 block.timestamp
        // 这种情况在正常流程中不会发生，因为交易在当前区块执行
        if (blockHash == bytes32(0)) {
            blockHash = bytes32(block.timestamp);
        }

        bytes32 hash = keccak256(abi.encodePacked(
            mainAccount,
            index,
            blockHash,
            block.number,
            address(this)
        ));
        return address(uint160(uint256(hash)));
    }
}
