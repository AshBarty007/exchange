// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Utils.sol";
import "./IAuth.sol";
import "./IAccount.sol";
import "./ITicket.sol";
import "./TicketStorage.sol";

/**
 * @title Ticket
 * @dev 门票逻辑合约，数据存储在 TicketStorage
 * @notice 本合约可升级替换，数据不丢失
 */
contract Ticket is ITicket {

    IAuth private _auth;
    IAccount private _accountContract;
    TicketStorage private _store;

    event TicketIssued(uint256 indexed ticketId, address indexed scenicArea, string name, uint256 totalSupply, uint256 minPrice, uint256 maxPrice);
    event TicketTransfer(address indexed from, address indexed to, uint256 indexed ticketId, uint256 amount);
    event TicketVerified(address indexed holder, uint256 indexed ticketId, uint256 amount, uint256 timestamp);
    event TicketBurned(uint256 indexed ticketId, uint256 amount, uint256 timestamp);
    event Approval(address indexed owner, address indexed spender, uint256 indexed ticketId, uint256 amount);

    error InvalidTicketId(uint256 ticketId);
    error InsufficientTicketBalance(address account, uint256 ticketId, uint256 required, uint256 available);
    error UnauthorizedTransfer(address from, address to);
    error TicketExpired(uint256 ticketId);
    error TicketNotActive(uint256 ticketId);
    error AlreadyVerified(address account, uint256 ticketId);
    error InvalidAmount(uint256 amount);

    constructor(address authContract, address accountContract, address ticketStorage) {
        Utils.requireValidAddress(authContract);
        Utils.requireValidAddress(accountContract);
        Utils.requireValidAddress(ticketStorage);
        _auth = IAuth(authContract);
        _accountContract = IAccount(accountContract);
        _store = TicketStorage(ticketStorage);
    }

    // ==================== 发行 ====================

    function issueTicket(
        address subAccount,
        string memory name,
        string memory description,
        string memory category,
        string memory location,
        string memory imageHash,
        uint256 totalSupply,
        uint256 minPrice,
        uint256 maxPrice,
        uint256 validFrom,
        uint256 validUntil,
        string memory infoHash
    ) public returns (uint256) {
        require(_auth.hasRole(_auth.SCENIC_OPERATOR_ROLE(), msg.sender), "Only scenic operator can issue tickets");
        require(totalSupply > 0, "Total supply must be greater than 0");
        require(minPrice > 0, "Min price must be greater than 0");
        require(maxPrice >= minPrice, "Max price must be >= min price");
        require(validUntil > block.timestamp, "End time must be in the future");
        require(validUntil > validFrom, "Invalid validity period");
        require(
            _accountContract.verifySubAccountOwnership(subAccount, msg.sender),
            "Sub-account must belong to scenic operator"
        );

        uint256 ticketId = _store.incrementTicketIdCounter();

        _store.setTicket(ticketId, TicketStorage.TicketInfo({
            ticketId: ticketId,
            scenicArea: msg.sender,
            name: name,
            description: description,
            category: category,
            location: location,
            imageHash: imageHash,
            totalSupply: totalSupply,
            minPrice: minPrice,
            maxPrice: maxPrice,
            validFrom: validFrom,
            validUntil: validUntil,
            infoHash: infoHash,
            active: true,
            createdAt: block.timestamp
        }));

        _store.addBalance(subAccount, ticketId, totalSupply);

        emit TicketIssued(ticketId, msg.sender, name, totalSupply, minPrice, maxPrice);
        return ticketId;
    }

    // ==================== 转移 ====================

    function transfer(address to, uint256 ticketId, uint256 amount) public returns (bool) {
        return _transfer(msg.sender, to, ticketId, amount);
    }

    function transferFrom(address from, address to, uint256 ticketId, uint256 amount) public returns (bool) {
        Utils.requireValidAddress(from);
        Utils.requireValidAddress(to);
        if (amount == 0) revert InvalidAmount(amount);

        uint256 currentAllowance = _store.allowance(from, msg.sender, ticketId);
        require(currentAllowance >= amount, "Insufficient allowance");
        _store.subAllowance(from, msg.sender, ticketId, amount);

        return _transfer(from, to, ticketId, amount);
    }

    function safeTransferFrom(address from, address to, uint256 ticketId, uint256 amount, bytes memory) public returns (bool) {
        if (msg.sender != from) {
            uint256 currentAllowance = _store.allowance(from, msg.sender, ticketId);
            require(currentAllowance >= amount, "Insufficient allowance");
            _store.subAllowance(from, msg.sender, ticketId, amount);
        }
        return _transfer(from, to, ticketId, amount);
    }

    function batchTransfer(address to, uint256[] memory ticketIds, uint256[] memory amounts) public returns (bool) {
        require(ticketIds.length == amounts.length, "Array length mismatch");
        for (uint256 i = 0; i < ticketIds.length; i++) {
            _transfer(msg.sender, to, ticketIds[i], amounts[i]);
        }
        return true;
    }

    function _transfer(address from, address to, uint256 ticketId, uint256 amount) internal returns (bool) {
        Utils.requireValidAddress(from);
        Utils.requireValidAddress(to);
        if (amount == 0) revert InvalidAmount(amount);

        _validateTicket(ticketId);

        uint256 bal = _store.balanceOf(from, ticketId);
        if (bal < amount) revert InsufficientTicketBalance(from, ticketId, amount, bal);

        _validateTicketTransfer(from, to);

        _store.subBalance(from, ticketId, amount);
        _store.addBalance(to, ticketId, amount);

        emit TicketTransfer(from, to, ticketId, amount);
        return true;
    }

    // ==================== 授权 ====================

    function approve(address spender, uint256 ticketId, uint256 amount) public returns (bool) {
        Utils.requireValidAddress(spender);
        require(amount > 0, "Amount must be greater than 0");
        _store.setAllowance(msg.sender, spender, ticketId, amount);
        emit Approval(msg.sender, spender, ticketId, amount);
        return true;
    }

    function approveFor(address subAccount, address spender, uint256 ticketId, uint256 amount) public returns (bool) {
        require(
            _accountContract.verifySubAccountOwnership(subAccount, msg.sender),
            "subAccount does not belong to caller"
        );
        Utils.requireValidAddress(spender);
        require(amount > 0, "Amount must be greater than 0");
        _store.setAllowance(subAccount, spender, ticketId, amount);
        emit Approval(subAccount, spender, ticketId, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 ticketId, uint256 addedValue) public returns (bool) {
        Utils.requireValidAddress(spender);
        _store.addAllowance(msg.sender, spender, ticketId, addedValue);
        emit Approval(msg.sender, spender, ticketId, _store.allowance(msg.sender, spender, ticketId));
        return true;
    }

    function decreaseAllowance(address spender, uint256 ticketId, uint256 subtractedValue) public returns (bool) {
        Utils.requireValidAddress(spender);
        _store.subAllowance(msg.sender, spender, ticketId, subtractedValue);
        emit Approval(msg.sender, spender, ticketId, _store.allowance(msg.sender, spender, ticketId));
        return true;
    }

    function setApprovalForAll(address, bool) public pure returns (bool) {
        return true;
    }

    // ==================== 核销 / 销毁 ====================

    function verifyTicket(address holder, uint256 ticketId, uint256 amount) public returns (bool) {
        require(_auth.hasRole(_auth.SCENIC_OPERATOR_ROLE(), msg.sender), "Only scenic operator can verify tickets");
        _validateTicket(ticketId);

        uint256 bal = _store.balanceOf(holder, ticketId);
        if (bal < amount) revert InsufficientTicketBalance(holder, ticketId, amount, bal);

        // 核销：扣减持票人余额，减少总供应量
        _store.subBalance(holder, ticketId, amount);
        _store.subTicketTotalSupply(ticketId, amount);

        emit TicketVerified(holder, ticketId, amount, block.timestamp);
        return true;
    }

    function burn(address subAccount, uint256 ticketId, uint256 amount) public returns (bool) {
        require(_auth.hasRole(_auth.SCENIC_OPERATOR_ROLE(), msg.sender), "Only scenic operator can burn tickets");
        _validateTicket(ticketId);
        require(
            _accountContract.verifySubAccountOwnership(subAccount, msg.sender),
            "Sub-account must belong to scenic operator"
        );

        uint256 bal = _store.balanceOf(subAccount, ticketId);
        if (bal < amount) revert InsufficientTicketBalance(subAccount, ticketId, amount, bal);

        _store.subBalance(subAccount, ticketId, amount);
        _store.subTicketTotalSupply(ticketId, amount);

        emit TicketBurned(ticketId, amount, block.timestamp);
        return true;
    }

    // ==================== 查询 ====================

    function getTicketInfo(uint256 ticketId) public view returns (ITicket.TicketInfo memory) {
        TicketStorage.TicketInfo memory s = _store.getTicket(ticketId);
        return ITicket.TicketInfo({
            ticketId: s.ticketId,
            scenicArea: s.scenicArea,
            name: s.name,
            description: s.description,
            category: s.category,
            location: s.location,
            imageHash: s.imageHash,
            totalSupply: s.totalSupply,
            minPrice: s.minPrice,
            maxPrice: s.maxPrice,
            validFrom: s.validFrom,
            validUntil: s.validUntil,
            infoHash: s.infoHash,
            active: s.active,
            createdAt: s.createdAt
        });
    }

    function getTicketPriceRange(uint256 ticketId) public view returns (uint256 minPrice, uint256 maxPrice) {
        TicketStorage.TicketInfo memory s = _store.getTicket(ticketId);
        return (s.minPrice, s.maxPrice);
    }

    function balanceOf(address account, uint256 ticketId) public view returns (uint256) {
        return _store.balanceOf(account, ticketId);
    }

    function allowance(address owner, address spender, uint256 ticketId) public view returns (uint256) {
        return _store.allowance(owner, spender, ticketId);
    }

    function getAccountTickets(address account) public view returns (uint256[] memory) {
        return _store.getAccountTickets(account);
    }

    // ==================== 内部校验 ====================

    function _validateTicket(uint256 ticketId) internal view {
        TicketStorage.TicketInfo memory info = _store.getTicket(ticketId);
        if (info.ticketId == 0) revert InvalidTicketId(ticketId);
        if (!info.active) revert TicketNotActive(ticketId);
        if (block.timestamp < info.validFrom) revert InvalidTicketId(ticketId); // 未到开售时间
        if (block.timestamp > info.validUntil) revert TicketExpired(ticketId);
    }

    function _validateTicketTransfer(address from, address to) internal view {
        if (_auth.isFrozen(from)) revert UnauthorizedTransfer(from, to);
        if (_auth.isFrozen(to)) revert UnauthorizedTransfer(from, to);
        // Exchange 合约撮合时 msg.sender 为 Exchange，允许子账户间及 Exchange 发起的转移
        bool isFromSub = _accountContract.isSubAccount(from);
        bool isToSub = _accountContract.isSubAccount(to);
        // 允许：子账户 <-> 子账户，或 Exchange 合约发起的 transferFrom
        if (isFromSub && isToSub) return;
        if (msg.sender != from) return; // transferFrom 调用方已通过 allowance 校验
        revert UnauthorizedTransfer(from, to);
    }
}
