// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IAuth.sol";
import "./IAccount.sol";
import "./IFiatToken.sol";
import "./ITicket.sol";
import "./IExchange.sol";

/**
 * @title Router
 * @dev 统一路由合约,提供简化的调用接口
 * @notice 封装核心业务逻辑,降低外部调用复杂度
 */
contract Router {

    IAuth    public authContract;
    IAccount public accountContract;
    IFiatToken public fiatTokenContract;
    ITicket  public ticketContract;
    IExchange public exchangeContract;

    constructor(
        address _auth,
        address _account,
        address _fiatToken,
        address _ticket,
        address _exchange
    ) {
        authContract      = IAuth(_auth);
        accountContract   = IAccount(_account);
        fiatTokenContract = IFiatToken(_fiatToken);
        ticketContract    = ITicket(_ticket);
        exchangeContract  = IExchange(_exchange);
    }

    // ==================== 账户 ====================

    /**
     * @dev 创建子账户（景区/做市商调用）
     */
    function registerUser(bytes32, string memory metadata)
        public
        returns (address mainAccount, address subAccount)
    {
        address newSubAccount = accountContract.createSubAccount(msg.sender, metadata);
        return (msg.sender, newSubAccount);
    }

    // ==================== 门票 ====================

    /**
     * @dev 景区发行门票
     * @param subAccount 接收门票的子账户地址
     * @param name 门票名称
     * @param totalSupply 发行总量
     * @param minPrice 最低价格
     * @param maxPrice 最高价格
     * @param validFrom 有效开始时间
     * @param validUntil 有效结束时间
     * @param infoHash 附属信息哈希
     */
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
    ) public returns (uint256 ticketId) {
        return ticketContract.issueTicket(
            subAccount,
            name,
            description,
            category,
            location,
            imageHash,
            totalSupply,
            minPrice,
            maxPrice,
            validFrom,
            validUntil,
            infoHash
        );
    }

    function transferTicket(address to, uint256 ticketId, uint256 amount)
        public
        returns (bool)
    {
        return ticketContract.transfer(to, ticketId, amount);
    }

    // ==================== 法币 ====================

    function depositFiat(address subAccount, uint256 amount) public returns (bool) {
        return fiatTokenContract.deposit(subAccount, amount);
    }

    function withdrawFiat(address to, uint256 amount) public returns (bool) {
        return fiatTokenContract.withdraw(to, amount);
    }

    // ==================== 交易 ====================

    /**
     * @dev 创建买单（主账户完全隔离）
     * @param subAccount 子账户地址
     * @param ticketId 门票ID
     * @param price 价格
     * @param amount 数量
     * @param expiry 签名过期时间戳
     * @param mainAccountSignature 主账户签名
     */
    function createBuyOrder(
        address subAccount,
        uint256 ticketId,
        uint256 price,
        uint256 amount,
        uint256 expiry,
        bytes memory mainAccountSignature
    ) public returns (uint256 orderId) {
        return exchangeContract.createOrder(
            subAccount,
            IExchange.OrderType.BUY,
            ticketId,
            price,
            amount,
            expiry,
            mainAccountSignature
        );
    }

    /**
     * @dev 创建卖单（主账户完全隔离）
     * @param subAccount 子账户地址
     * @param ticketId 门票ID
     * @param price 价格
     * @param amount 数量
     * @param expiry 签名过期时间戳
     * @param mainAccountSignature 主账户签名
     */
    function createSellOrder(
        address subAccount,
        uint256 ticketId,
        uint256 price,
        uint256 amount,
        uint256 expiry,
        bytes memory mainAccountSignature
    ) public returns (uint256 orderId) {
        return exchangeContract.createOrder(
            subAccount,
            IExchange.OrderType.SELL,
            ticketId,
            price,
            amount,
            expiry,
            mainAccountSignature
        );
    }

    /**
     * @dev 撤单（主账户完全隔离）
     * @param orderId 订单ID
     * @param expiry 签名过期时间戳（管理员撤单传 0）
     * @param mainAccountSignature 主账户签名（管理员撤单传空 bytes）
     */
    function cancelOrder(uint256 orderId, uint256 expiry, bytes memory mainAccountSignature) public returns (bool) {
        return exchangeContract.cancelOrder(orderId, expiry, mainAccountSignature);
    }

    // ==================== 查询 ====================

    function getUserInfo(address user)
        public
        view
        returns (
            IAccount.AccountInfo memory accountInfo,
            address[] memory subAccounts,
            uint256 fiatBalance,
            uint256[] memory tickets
        )
    {
        accountInfo = accountContract.getAccountInfo(user);
        subAccounts = accountContract.getSubAccounts(user);

        if (subAccounts.length > 0) {
            fiatBalance = fiatTokenContract.balanceOf(subAccounts[0]);
            tickets = ticketContract.getAccountTickets(subAccounts[0]);
        } else {
            fiatBalance = 0;
            tickets = new uint256[](0);
        }
    }

    function getTicketDetails(uint256 ticketId)
        public
        view
        returns (
            ITicket.TicketInfo memory ticketInfo,
            uint256[] memory orderBook
        )
    {
        ticketInfo = ticketContract.getTicketInfo(ticketId);
        orderBook  = exchangeContract.getTicketOrderBook(ticketId);
    }

    function batchGetOrders(uint256[] memory orderIds)
        public
        view
        returns (IExchange.Order[] memory orders)
    {
        orders = new IExchange.Order[](orderIds.length);
        for (uint256 i = 0; i < orderIds.length; i++) {
            orders[i] = exchangeContract.getOrder(orderIds[i]);
        }
    }

    function getUserOrders(address user) public view returns (uint256[] memory) {
        return exchangeContract.getAccountOrders(user);
    }

    function checkAccountStatus(address account)
        public
        view
        returns (bool isFrozen, bool isActive, bytes32 role)
    {
        isFrozen = authContract.isFrozen(account);
        isActive = accountContract.isActive(account);
        role     = accountContract.getAccountRole(account);
    }

    function getContractAddresses()
        public
        view
        returns (address auth, address account, address fiatToken, address ticket, address exchange)
    {
        return (
            address(authContract),
            address(accountContract),
            address(fiatTokenContract),
            address(ticketContract),
            address(exchangeContract)
        );
    }
}
