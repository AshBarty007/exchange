// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Utils.sol";
import "./IAuth.sol";
import "./IAccount.sol";

/**
 * @title Auth
 * @dev 统一角色权限管理合约,实现基于角色的访问控制(RBAC)
 * @notice 支持5类角色:监管/银行、交易所管理员、景区运营、做市商、消费者
 */
contract Auth is IAuth {

    /**
     * @dev 角色定义
     */
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");           // 监管节点
    bytes32 public constant BANK_ROLE = keccak256("BANK_ROLE");                     // 银行节点
    bytes32 public constant EXCHANGE_ADMIN_ROLE = keccak256("EXCHANGE_ADMIN_ROLE"); // 交易所管理员
    bytes32 public constant SCENIC_OPERATOR_ROLE = keccak256("SCENIC_OPERATOR_ROLE"); // 景区运营
    bytes32 public constant MARKET_MAKER_ROLE = keccak256("MARKET_MAKER_ROLE");     // 做市商
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");             // 消费者
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");                   // 系统管理员

    /**
     * @dev 角色成员映射 (角色 => 地址 => 是否拥有)
     */
    mapping(bytes32 => mapping(address => bool)) private _roles;

    /**
     * @dev 账户冻结状态映射
     */
    mapping(address => bool) private _frozen;

    /**
     * @dev 账户冻结原因映射
     */
    mapping(address => string) private _freezeReason;

    /**
     * @dev 多重签名要求配置 (操作类型 => 需要的签名数量)
     */
    mapping(bytes32 => uint256) private _multiSigRequirements;

    /**
     * @dev 多重签名记录 (操作哈希 => 签名者 => 是否已签名)
     */
    mapping(bytes32 => mapping(address => bool)) private _multiSigApprovals;

    /**
     * @dev 多重签名计数 (操作哈希 => 已签名数量)
     */
    mapping(bytes32 => uint256) private _multiSigCount;

    /**
     * @dev 合约管理员
     */
    address private _contractAdmin;

    /**
     * @dev Account合约地址
     */
    IAccount private _accountContract;

    /**
     * @dev 角色授予事件
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev 角色撤销事件
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev 账户冻结事件
     */
    event AccountFrozen(address indexed account, string reason, address indexed operator);

    /**
     * @dev 账户解冻事件
     */
    event AccountUnfrozen(address indexed account, address indexed operator);

    /**
     * @dev 多重签名批准事件
     */
    event MultiSigApproval(bytes32 indexed operationHash, address indexed signer, uint256 currentCount, uint256 required);

    /**
     * @dev 多重签名执行事件
     */
    event MultiSigExecuted(bytes32 indexed operationHash, uint256 signatureCount);

    /**
     * @dev 错误:未授权访问
     */
    error UnauthorizedAccess(address account, bytes32 role);

    /**
     * @dev 错误:账户已冻结
     */
    error AccountFrozenError(address account);

    /**
     * @dev 错误:角色已存在
     */
    error RoleAlreadyGranted(address account, bytes32 role);

    /**
     * @dev 错误:角色不存在
     */
    error RoleNotGranted(address account, bytes32 role);

    /**
     * @dev 错误:多重签名不足
     */
    error InsufficientSignatures(uint256 current, uint256 required);

    /**
     * @dev 错误:已签名
     */
    error AlreadySigned(address signer);

    /**
     * @dev 构造函数
     */
    constructor() {
        _contractAdmin = msg.sender;
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev 设置Account合约地址(测试阶段开放调用,只能设置一次)
     * @param accountContract Account合约地址
     */
    function setAccountContract(address accountContract) public {
        require(address(_accountContract) == address(0), "Account contract already set");
        Utils.requireValidAddress(accountContract);
        _accountContract = IAccount(accountContract);
    }

    /**
     * @dev 仅限指定角色访问
     */
    modifier onlyRole(bytes32 role) {
        if (!hasRole(role, msg.sender)) {
            revert UnauthorizedAccess(msg.sender, role);
        }
        _;
    }

    /**
     * @dev 仅限未冻结账户
     */
    modifier notFrozen(address account) {
        if (_frozen[account]) {
            revert AccountFrozenError(account);
        }
        _;
    }

    /**
     * @dev 检查账户是否拥有指定角色
     * @param role 角色标识
     * @param account 账户地址
     * @return 是否拥有角色
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }

    /**
     * @dev 授予角色
     * @param role 角色标识
     * @param account 账户地址
     */
    function grantRole(bytes32 role, address account)
        public
        onlyRole(ADMIN_ROLE)
    {
        _grantRole(role, account);

        // 如果授予的是业务角色且Account合约已设置,自动注册主账户
        if (address(_accountContract) != address(0) && _isBusinessRole(role)) {
            _autoRegisterMainAccount(account, role);
        }
    }

    /**
     * @dev 批量授予角色
     * @param role 角色标识
     * @param accounts 账户地址数组
     */
    function batchGrantRole(bytes32 role, address[] memory accounts)
        public
        onlyRole(ADMIN_ROLE)
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            _grantRole(role, accounts[i]);

            // 如果授予的是业务角色且Account合约已设置,自动注册主账户
            if (address(_accountContract) != address(0) && _isBusinessRole(role)) {
                _autoRegisterMainAccount(accounts[i], role);
            }
        }
    }

    /**
     * @dev 检查是否为业务角色(需要主账户的角色)
     * @param role 角色标识
     * @return 是否为业务角色
     */
    function _isBusinessRole(bytes32 role) internal pure returns (bool) {
        return role == SCENIC_OPERATOR_ROLE ||
               role == MARKET_MAKER_ROLE ||
               role == CONSUMER_ROLE ||
               role == BANK_ROLE ||
               role == EXCHANGE_ADMIN_ROLE;
    }

    /**
     * @dev 自动注册主账户
     * @param account 账户地址
     * @param role 角色标识
     */
    function _autoRegisterMainAccount(address account, bytes32 role) internal {
        // 通过接口调用，账户已注册时忽略错误
        try _accountContract.registerMainAccount(account, role, "") {
        } catch {
            // 账户已注册或其他非致命错误，忽略
        }
    }

    /**
     * @dev 内部授予角色函数
     * @param role 角色标识
     * @param account 账户地址
     */
    function _grantRole(bytes32 role, address account) internal {
        Utils.requireValidAddress(account);

        if (_roles[role][account]) {
            revert RoleAlreadyGranted(account, role);
        }

        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    /**
     * @dev 撤销角色
     * @param role 角色标识
     * @param account 账户地址
     */
    function revokeRole(bytes32 role, address account)
        public
        onlyRole(ADMIN_ROLE)
    {
        _revokeRole(role, account);
    }

    /**
     * @dev 批量撤销角色
     * @param role 角色标识
     * @param accounts 账户地址数组
     */
    function batchRevokeRole(bytes32 role, address[] memory accounts)
        public
        onlyRole(ADMIN_ROLE)
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            _revokeRole(role, accounts[i]);
        }
    }

    /**
     * @dev 内部撤销角色函数
     * @param role 角色标识
     * @param account 账户地址
     */
    function _revokeRole(bytes32 role, address account) internal {
        if (!_roles[role][account]) {
            revert RoleNotGranted(account, role);
        }

        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /**
     * @dev 放弃角色(自愿放弃)
     * @param role 角色标识
     */
    function renounceRole(bytes32 role) public {
        _revokeRole(role, msg.sender);
    }

    /**
     * @dev 冻结账户(仅监管/交易所管理员可执行)
     * @param account 账户地址
     * @param reason 冻结原因
     */
    function freezeAccount(address account, string memory reason)
        public
    {
        require(
            hasRole(REGULATOR_ROLE, msg.sender) ||
            hasRole(EXCHANGE_ADMIN_ROLE, msg.sender),
            "Only regulator or exchange admin can freeze accounts"
        );

        Utils.requireValidAddress(account);
        _frozen[account] = true;
        _freezeReason[account] = reason;

        emit AccountFrozen(account, reason, msg.sender);
    }

    /**
     * @dev 解冻账户(仅监管/交易所管理员可执行)
     * @param account 账户地址
     */
    function unfreezeAccount(address account)
        public
    {
        require(
            hasRole(REGULATOR_ROLE, msg.sender) ||
            hasRole(EXCHANGE_ADMIN_ROLE, msg.sender),
            "Only regulator or exchange admin can unfreeze accounts"
        );

        Utils.requireValidAddress(account);
        _frozen[account] = false;
        delete _freezeReason[account];

        emit AccountUnfrozen(account, msg.sender);
    }

    /**
     * @dev 检查账户是否被冻结
     * @param account 账户地址
     * @return 是否被冻结
     */
    function isFrozen(address account) public view returns (bool) {
        return _frozen[account];
    }

    /**
     * @dev 获取账户冻结原因
     * @param account 账户地址
     * @return 冻结原因
     */
    function getFreezeReason(address account) public view returns (string memory) {
        return _freezeReason[account];
    }

    /**
     * @dev 批量检查账户冻结状态
     * @param accounts 账户地址数组
     * @return 冻结状态数组
     */
    function areFrozen(address[] memory accounts) public view returns (bool[] memory) {
        bool[] memory results = new bool[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            results[i] = _frozen[accounts[i]];
        }
        return results;
    }

    /**
     * @dev 设置多重签名要求
     * @param operationType 操作类型
     * @param requiredSignatures 需要的签名数量
     */
    function setMultiSigRequirement(bytes32 operationType, uint256 requiredSignatures)
        public
        onlyRole(ADMIN_ROLE)
    {
        require(requiredSignatures > 0, "Required signatures must be greater than 0");
        _multiSigRequirements[operationType] = requiredSignatures;
    }

    /**
     * @dev 获取多重签名要求
     * @param operationType 操作类型
     * @return 需要的签名数量
     */
    function getMultiSigRequirement(bytes32 operationType) public view returns (uint256) {
        return _multiSigRequirements[operationType];
    }

    /**
     * @dev 批准多重签名操作
     * @param operationHash 操作哈希
     * @param operationType 操作类型
     */
    function approveMultiSig(bytes32 operationHash, bytes32 operationType)
        public
        onlyRole(REGULATOR_ROLE)
        notFrozen(msg.sender)
    {
        if (_multiSigApprovals[operationHash][msg.sender]) {
            revert AlreadySigned(msg.sender);
        }

        _multiSigApprovals[operationHash][msg.sender] = true;
        _multiSigCount[operationHash]++;

        uint256 required = _multiSigRequirements[operationType];

        emit MultiSigApproval(
            operationHash,
            msg.sender,
            _multiSigCount[operationHash],
            required
        );
    }

    /**
     * @dev 检查多重签名是否满足要求
     * @param operationHash 操作哈希
     * @param operationType 操作类型
     * @return 是否满足要求
     */
    function isMultiSigApproved(bytes32 operationHash, bytes32 operationType)
        public
        view
        returns (bool)
    {
        uint256 required = _multiSigRequirements[operationType];
        if (required == 0) {
            return true; // 不需要多重签名
        }
        return _multiSigCount[operationHash] >= required;
    }

    /**
     * @dev 验证多重签名要求
     * @param operationHash 操作哈希
     * @param operationType 操作类型
     */
    function requireMultiSigApproval(bytes32 operationHash, bytes32 operationType)
        public
        view
    {
        uint256 required = _multiSigRequirements[operationType];
        uint256 current = _multiSigCount[operationHash];

        if (required > 0 && current < required) {
            revert InsufficientSignatures(current, required);
        }
    }

    /**
     * @dev 获取多重签名当前签名数
     * @param operationHash 操作哈希
     * @return 当前签名数
     */
    function getMultiSigCount(bytes32 operationHash) public view returns (uint256) {
        return _multiSigCount[operationHash];
    }

    /**
     * @dev 检查地址是否已签名
     * @param operationHash 操作哈希
     * @param signer 签名者地址
     * @return 是否已签名
     */
    function hasSigned(bytes32 operationHash, address signer) public view returns (bool) {
        return _multiSigApprovals[operationHash][signer];
    }

    /**
     * @dev 获取合约管理员
     * @return 管理员地址
     */
    function getContractAdmin() public view returns (address) {
        return _contractAdmin;
    }

    /**
     * @dev 转移合约管理员(测试阶段开放调用)
     * @param newAdmin 新管理员地址
     */
    function transferAdmin(address newAdmin) public onlyRole(ADMIN_ROLE) {
        Utils.requireValidAddress(newAdmin);

        // 撤销旧管理员的ADMIN_ROLE
        _roles[ADMIN_ROLE][_contractAdmin] = false;

        // 授予新管理员ADMIN_ROLE
        _contractAdmin = newAdmin;
        _roles[ADMIN_ROLE][newAdmin] = true;

        emit RoleGranted(ADMIN_ROLE, newAdmin, msg.sender);
    }

    /**
     * @dev 检查账户是否拥有任一管理员权限
     * @param account 账户地址
     * @return 是否拥有管理员权限
     */
    function isAnyAdmin(address account) public view returns (bool) {
        return hasRole(ADMIN_ROLE, account) ||
               hasRole(REGULATOR_ROLE, account) ||
               hasRole(EXCHANGE_ADMIN_ROLE, account);
    }

    /**
     * @dev 获取所有角色常量
     * @return 角色常量数组
     */
    function getAllRoles() public pure returns (bytes32[] memory) {
        bytes32[] memory roles = new bytes32[](7);
        roles[0] = REGULATOR_ROLE;
        roles[1] = BANK_ROLE;
        roles[2] = EXCHANGE_ADMIN_ROLE;
        roles[3] = SCENIC_OPERATOR_ROLE;
        roles[4] = MARKET_MAKER_ROLE;
        roles[5] = CONSUMER_ROLE;
        roles[6] = ADMIN_ROLE;
        return roles;
    }
}
