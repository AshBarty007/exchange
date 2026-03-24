// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title FiatStorage
 * @dev 法币凭证数据持久化合约，只存储数据，不含业务逻辑
 * @notice 部署一次永不重新部署，逻辑合约升级时只需更新 logicContract
 */
contract FiatStorage {

    /// @dev 只有逻辑合约可以写入
    address public logicContract;

    /// @dev 合约部署者
    address public owner;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event LogicContractUpdated(address indexed oldLogic, address indexed newLogic);

    modifier onlyLogic() {
        require(msg.sender == logicContract, "FiatStorage: only logic contract");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "FiatStorage: only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setLogicContract(address _logic) external onlyOwner {
        require(_logic != address(0), "FiatStorage: zero address");
        emit LogicContractUpdated(logicContract, _logic);
        logicContract = _logic;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "FiatStorage: zero address");
        owner = newOwner;
    }

    // ==================== 写入接口（仅逻辑合约） ====================

    function setBalance(address account, uint256 amount) external onlyLogic {
        _balances[account] = amount;
    }

    function addBalance(address account, uint256 amount) external onlyLogic {
        _balances[account] += amount;
    }

    function subBalance(address account, uint256 amount) external onlyLogic {
        require(_balances[account] >= amount, "FiatStorage: insufficient balance");
        _balances[account] -= amount;
    }

    function setAllowance(address owner_, address spender, uint256 amount) external onlyLogic {
        _allowances[owner_][spender] = amount;
    }

    function addAllowance(address owner_, address spender, uint256 amount) external onlyLogic {
        _allowances[owner_][spender] += amount;
    }

    function subAllowance(address owner_, address spender, uint256 amount) external onlyLogic {
        require(_allowances[owner_][spender] >= amount, "FiatStorage: insufficient allowance");
        _allowances[owner_][spender] -= amount;
    }

    function addTotalSupply(uint256 amount) external onlyLogic {
        _totalSupply += amount;
    }

    function subTotalSupply(uint256 amount) external onlyLogic {
        require(_totalSupply >= amount, "FiatStorage: underflow");
        _totalSupply -= amount;
    }

    // ==================== 读取接口（公开） ====================

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner_, address spender) external view returns (uint256) {
        return _allowances[owner_][spender];
    }
}
