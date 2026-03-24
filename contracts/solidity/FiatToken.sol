// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Utils.sol";
import "./IAuth.sol";
import "./IAccount.sol";
import "./IFiatToken.sol";
import "./FiatStorage.sol";

/**
 * @title FiatToken
 * @dev 法币凭证逻辑合约，数据存储在 FiatStorage
 * @notice 本合约可升级替换，数据不丢失
 */
contract FiatToken is IFiatToken {

    string public constant name = "Fiat Token";
    string public constant symbol = "FIAT";
    uint8 public constant decimals = 4;

    IAuth private _auth;
    IAccount private _accountContract;
    FiatStorage private _store;

    address public exchangeContract;
    address public burnAccount;

    mapping(address => bool) private _bankAddresses;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount, uint256 timestamp);
    event Burn(address indexed from, uint256 amount, uint256 timestamp);
    event Deposit(address indexed mainAccount, address indexed subAccount, uint256 amount);
    event Withdraw(address indexed account, address indexed bankAddress, uint256 amount);
    event TransferToBurnAccount(address indexed from, uint256 amount, uint256 timestamp);

    error InsufficientBalance(address account, uint256 required, uint256 available);
    error InsufficientAllowance(address owner, address spender, uint256 required, uint256 available);
    error UnauthorizedTransfer(address from, address to);
    error InvalidAmount(uint256 amount);
    error NotBankAddress(address addr);

    modifier onlyBank() {
        require(_auth.hasRole(_auth.BANK_ROLE(), msg.sender), "Only bank can perform this operation");
        _;
    }

    modifier notFrozen(address account) {
        require(!_auth.isFrozen(account), "Account is frozen");
        _;
    }

    constructor(address authContract, address accountContract, address fiatStorage) {
        Utils.requireValidAddress(authContract);
        Utils.requireValidAddress(accountContract);
        Utils.requireValidAddress(fiatStorage);
        _auth = IAuth(authContract);
        _accountContract = IAccount(accountContract);
        _store = FiatStorage(fiatStorage);
        burnAccount = address(0);
    }

    // ==================== 管理接口 ====================

    function addBankAddress(address bankAddress) public onlyBank {
        Utils.requireValidAddress(bankAddress);
        _bankAddresses[bankAddress] = true;
    }

    function removeBankAddress(address bankAddress) public onlyBank {
        _bankAddresses[bankAddress] = false;
    }

    function setBurnAccount(address _burnAccount) public onlyBank {
        Utils.requireValidAddress(_burnAccount);
        burnAccount = _burnAccount;
    }

    function setExchangeContract(address _exchangeContract) public onlyBank {
        Utils.requireValidAddress(_exchangeContract);
        exchangeContract = _exchangeContract;
    }

    function isBankAddress(address addr) public view returns (bool) {
        return _bankAddresses[addr];
    }

    // ==================== Mint / Burn ====================

    function mint(address to, uint256 amount)
        public
        onlyBank
        notFrozen(to)
        returns (bool)
    {
        Utils.requireValidAddress(to);
        if (amount == 0) revert InvalidAmount(amount);

        require(!_accountContract.isSubAccount(to), "Can only mint to main account");
        require(_accountContract.isMainAccount(to), "Recipient must be a registered main account");

        _store.addBalance(to, amount);
        _store.addTotalSupply(amount);

        emit Mint(to, amount, block.timestamp);
        emit Transfer(address(0), to, amount);
        return true;
    }

    function burn(address from, uint256 amount) public onlyBank returns (bool) {
        Utils.requireValidAddress(from);
        if (amount == 0) revert InvalidAmount(amount);

        uint256 bal = _store.balanceOf(from);
        if (bal < amount) revert InsufficientBalance(from, amount, bal);

        _store.subBalance(from, amount);
        _store.subTotalSupply(amount);

        emit Burn(from, amount, block.timestamp);
        emit Transfer(from, address(0), amount);
        return true;
    }

    // ==================== ERC20 标准接口 ====================

    function totalSupply() public view returns (uint256) {
        return _store.totalSupply();
    }

    function balanceOf(address account) public view returns (uint256) {
        return _store.balanceOf(account);
    }

    function allowance(address owner, address spender) public view returns (uint256) {
        return _store.allowance(owner, spender);
    }

    function approve(address spender, uint256 amount)
        public
        notFrozen(msg.sender)
        returns (bool)
    {
        Utils.requireValidAddress(spender);
        _store.setAllowance(msg.sender, spender, amount);
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function approveFor(address subAccount, address spender, uint256 amount)
        public
        notFrozen(subAccount)
        returns (bool)
    {
        require(
            _accountContract.verifySubAccountOwnership(subAccount, msg.sender),
            "subAccount does not belong to caller"
        );
        Utils.requireValidAddress(spender);
        _store.setAllowance(subAccount, spender, amount);
        emit Approval(subAccount, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount)
        public
        notFrozen(msg.sender)
        notFrozen(to)
        returns (bool)
    {
        return _transfer(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amount)
        public
        notFrozen(from)
        notFrozen(to)
        notFrozen(msg.sender)
        returns (bool)
    {
        uint256 currentAllowance = _store.allowance(from, msg.sender);
        if (currentAllowance < amount) {
            revert InsufficientAllowance(from, msg.sender, amount, currentAllowance);
        }
        _store.subAllowance(from, msg.sender, amount);
        return _transfer(from, to, amount);
    }

    function increaseAllowance(address spender, uint256 addedValue)
        public
        notFrozen(msg.sender)
        returns (bool)
    {
        _store.addAllowance(msg.sender, spender, addedValue);
        emit Approval(msg.sender, spender, _store.allowance(msg.sender, spender));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue)
        public
        notFrozen(msg.sender)
        returns (bool)
    {
        _store.subAllowance(msg.sender, spender, subtractedValue);
        emit Approval(msg.sender, spender, _store.allowance(msg.sender, spender));
        return true;
    }

    // ==================== 充值 / 提现 ====================

    function deposit(address subAccount, uint256 amount)
        public
        notFrozen(msg.sender)
        notFrozen(subAccount)
        returns (bool)
    {
        require(
            _accountContract.verifySubAccountOwnership(subAccount, msg.sender),
            "Sub-account does not belong to caller"
        );
        bool success = _transfer(msg.sender, subAccount, amount);
        if (success) emit Deposit(msg.sender, subAccount, amount);
        return success;
    }

    function withdraw(address to, uint256 amount)
        public
        notFrozen(msg.sender)
        returns (bool)
    {
        bool isValidWithdraw = false;
        if (_accountContract.isSubAccount(msg.sender)) {
            address mainAccount = _accountContract.getMainAccount(msg.sender);
            if (to == mainAccount) isValidWithdraw = true;
        }
        if (isBankAddress(to)) isValidWithdraw = true;
        require(isValidWithdraw, "Invalid withdraw target");

        bool success = _transfer(msg.sender, to, amount);
        if (success) emit Withdraw(msg.sender, to, amount);
        return success;
    }

    function batchTransfer(address[] memory recipients, uint256[] memory amounts)
        public
        notFrozen(msg.sender)
        returns (bool)
    {
        require(recipients.length == amounts.length, "Array length mismatch");
        require(recipients.length > 0 && recipients.length <= 100, "Invalid array length");
        for (uint256 i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
        return true;
    }

    // ==================== 内部逻辑 ====================

    function _transfer(address from, address to, uint256 amount)
        internal
        returns (bool)
    {
        Utils.requireValidAddress(from);
        Utils.requireValidAddress(to);
        if (amount == 0) revert InvalidAmount(amount);

        uint256 bal = _store.balanceOf(from);
        if (bal < amount) revert InsufficientBalance(from, amount, bal);

        _validateTransfer(from, to);

        _store.subBalance(from, amount);
        _store.addBalance(to, amount);

        if (to == burnAccount) {
            emit TransferToBurnAccount(from, amount, block.timestamp);
        }

        emit Transfer(from, to, amount);
        return true;
    }

    function _validateTransfer(address from, address to) internal view {
        // 场景1: 子账户间流转
        if (_accountContract.isSubAccount(from) && _accountContract.isSubAccount(to)) return;

        // 场景2: 主账户 -> 自己的子账户（充值）
        if (!_accountContract.isSubAccount(from)) {
            if (_accountContract.verifySubAccountOwnership(to, from)) return;
        }

        // 场景3: 子账户 -> 自己的主账户（提现）
        if (_accountContract.isSubAccount(from) && !_accountContract.isSubAccount(to)) {
            if (_accountContract.verifySubAccountOwnership(from, to)) return;
        }

        // 场景4: 主账户 -> 银行销毁账户
        if (!_accountContract.isSubAccount(from) && to == burnAccount) return;

        // 场景5: 提现到银行地址
        if (isBankAddress(to)) return;

        // 场景6: 银行操作
        if (_auth.hasRole(_auth.BANK_ROLE(), from) || _auth.hasRole(_auth.BANK_ROLE(), to)) return;

        // 场景7: Exchange 合约发起的 transferFrom
        if (msg.sender == exchangeContract) return;

        revert UnauthorizedTransfer(from, to);
    }
}
