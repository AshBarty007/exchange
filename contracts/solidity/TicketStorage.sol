// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TicketStorage
 * @dev 门票数据持久化合约，只存储数据，不含业务逻辑
 * @notice 部署一次永不重新部署，逻辑合约升级时只需更新 logicContract
 */
contract TicketStorage {

    struct TicketInfo {
        uint256 ticketId;
        address scenicArea;
        string name;
        string description;
        string category;
        string location;
        string imageHash;
        uint256 totalSupply;
        uint256 minPrice;
        uint256 maxPrice;
        uint256 validFrom;
        uint256 validUntil;
        string infoHash;
        bool active;
        uint256 createdAt;
    }

    /// @dev 只有逻辑合约可以写入
    address public logicContract;

    /// @dev 合约部署者
    address public owner;

    uint256 private _ticketIdCounter;

    /// ticketId => TicketInfo
    mapping(uint256 => TicketInfo) private _tickets;

    /// account => ticketId => balance
    mapping(address => mapping(uint256 => uint256)) private _balances;

    /// owner => spender => ticketId => allowance
    mapping(address => mapping(address => mapping(uint256 => uint256))) private _allowances;

    /// account => ticketId[]
    mapping(address => uint256[]) private _accountTickets;

    /// ticketId => holders[]
    mapping(uint256 => address[]) private _ticketHolders;

    /// account => ticketId => already in _accountTickets list
    mapping(address => mapping(uint256 => bool)) private _accountHasTicket;

    event LogicContractUpdated(address indexed oldLogic, address indexed newLogic);

    modifier onlyLogic() {
        require(msg.sender == logicContract, "TicketStorage: only logic contract");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "TicketStorage: only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        _ticketIdCounter = 1;
    }

    function setLogicContract(address _logic) external onlyOwner {
        require(_logic != address(0), "TicketStorage: zero address");
        emit LogicContractUpdated(logicContract, _logic);
        logicContract = _logic;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TicketStorage: zero address");
        owner = newOwner;
    }

    // ==================== TicketInfo 写入 ====================

    function setTicket(uint256 ticketId, TicketInfo memory info) external onlyLogic {
        _tickets[ticketId] = info;
    }

    function setTicketActive(uint256 ticketId, bool active) external onlyLogic {
        _tickets[ticketId].active = active;
    }

    function subTicketTotalSupply(uint256 ticketId, uint256 amount) external onlyLogic {
        require(_tickets[ticketId].totalSupply >= amount, "TicketStorage: underflow");
        _tickets[ticketId].totalSupply -= amount;
    }

    function incrementTicketIdCounter() external onlyLogic returns (uint256) {
        uint256 id = _ticketIdCounter;
        _ticketIdCounter++;
        return id;
    }

    // ==================== 余额写入 ====================

    function addBalance(address account, uint256 ticketId, uint256 amount) external onlyLogic {
        _balances[account][ticketId] += amount;
        if (!_accountHasTicket[account][ticketId]) {
            _accountHasTicket[account][ticketId] = true;
            _accountTickets[account].push(ticketId);
            _ticketHolders[ticketId].push(account);
        }
    }

    function subBalance(address account, uint256 ticketId, uint256 amount) external onlyLogic {
        require(_balances[account][ticketId] >= amount, "TicketStorage: insufficient balance");
        _balances[account][ticketId] -= amount;
    }

    // ==================== 授权写入 ====================

    function setAllowance(address owner_, address spender, uint256 ticketId, uint256 amount) external onlyLogic {
        _allowances[owner_][spender][ticketId] = amount;
    }

    function subAllowance(address owner_, address spender, uint256 ticketId, uint256 amount) external onlyLogic {
        require(_allowances[owner_][spender][ticketId] >= amount, "TicketStorage: insufficient allowance");
        _allowances[owner_][spender][ticketId] -= amount;
    }

    function addAllowance(address owner_, address spender, uint256 ticketId, uint256 amount) external onlyLogic {
        _allowances[owner_][spender][ticketId] += amount;
    }

    // ==================== 读取接口（公开） ====================

    function getTicket(uint256 ticketId) external view returns (TicketInfo memory) {
        return _tickets[ticketId];
    }

    function ticketIdCounter() external view returns (uint256) {
        return _ticketIdCounter;
    }

    function balanceOf(address account, uint256 ticketId) external view returns (uint256) {
        return _balances[account][ticketId];
    }

    function allowance(address owner_, address spender, uint256 ticketId) external view returns (uint256) {
        return _allowances[owner_][spender][ticketId];
    }

    function getAccountTickets(address account) external view returns (uint256[] memory) {
        return _accountTickets[account];
    }

    function getTicketHolders(uint256 ticketId) external view returns (address[] memory) {
        return _ticketHolders[ticketId];
    }
}
