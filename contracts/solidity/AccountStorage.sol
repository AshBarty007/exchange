// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AccountStorage
 * @dev 账户数据持久化合约，只存储数据，不含业务逻辑
 * @notice 部署一次永不重新部署，逻辑合约升级时只需更新 logicContract
 */
contract AccountStorage {

    enum AccountType { NONE, MAIN, SUB }

    struct AccountInfo {
        AccountType accountType;
        address mainAccount;
        address[] subAccounts;
        bytes32 role;
        uint256 createdAt;
        bool active;
        string metadata;
    }

    /// @dev 只有逻辑合约可以写入
    address public logicContract;

    /// @dev 合约部署者，用于初始设置 logicContract
    address public owner;

    mapping(address => AccountInfo) private _accounts;
    mapping(address => uint256) private _subAccountCount;
    mapping(address => mapping(uint256 => address)) private _subAccountByIndex;
    mapping(address => uint256) private _nextSubAccountIndex;

    event LogicContractUpdated(address indexed oldLogic, address indexed newLogic);

    modifier onlyLogic() {
        require(msg.sender == logicContract, "AccountStorage: only logic contract");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "AccountStorage: only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setLogicContract(address _logic) external onlyOwner {
        require(_logic != address(0), "AccountStorage: zero address");
        emit LogicContractUpdated(logicContract, _logic);
        logicContract = _logic;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AccountStorage: zero address");
        owner = newOwner;
    }

    // ==================== 写入接口（仅逻辑合约） ====================

    function setAccount(address account, AccountInfo memory info) external onlyLogic {
        _accounts[account] = info;
    }

    function setAccountType(address account, AccountType t) external onlyLogic {
        _accounts[account].accountType = t;
    }

    function setAccountActive(address account, bool active) external onlyLogic {
        _accounts[account].active = active;
    }

    function setAccountMetadata(address account, string memory metadata) external onlyLogic {
        _accounts[account].metadata = metadata;
    }

    function pushSubAccount(address mainAccount, address subAccount) external onlyLogic {
        _accounts[mainAccount].subAccounts.push(subAccount);
        uint256 index = _nextSubAccountIndex[mainAccount];
        _subAccountByIndex[mainAccount][index] = subAccount;
        _subAccountCount[mainAccount]++;
        _nextSubAccountIndex[mainAccount]++;
    }

    // ==================== 读取接口（公开） ====================

    function getAccount(address account) external view returns (AccountInfo memory) {
        return _accounts[account];
    }

    function getAccountType(address account) external view returns (AccountType) {
        return _accounts[account].accountType;
    }

    function getMainAccount(address account) external view returns (address) {
        return _accounts[account].mainAccount;
    }

    function getSubAccounts(address mainAccount) external view returns (address[] memory) {
        return _accounts[mainAccount].subAccounts;
    }

    function getSubAccountCount(address mainAccount) external view returns (uint256) {
        return _subAccountCount[mainAccount];
    }

    function getSubAccountByIndex(address mainAccount, uint256 index) external view returns (address) {
        return _subAccountByIndex[mainAccount][index];
    }

    function getNextSubAccountIndex(address mainAccount) external view returns (uint256) {
        return _nextSubAccountIndex[mainAccount];
    }

    function isActive(address account) external view returns (bool) {
        return _accounts[account].active;
    }

    function getRole(address account) external view returns (bytes32) {
        return _accounts[account].role;
    }
}
