// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITicket {
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

    function balanceOf(address account, uint256 ticketId) external view returns (uint256);
    function allowance(address owner, address spender, uint256 ticketId) external view returns (uint256);
    function approve(address spender, uint256 ticketId, uint256 amount) external returns (bool);
    function transfer(address to, uint256 ticketId, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 ticketId, uint256 amount) external returns (bool);
    function getTicketPriceRange(uint256 ticketId) external view returns (uint256 minPrice, uint256 maxPrice);
    function getTicketInfo(uint256 ticketId) external view returns (TicketInfo memory);
    function getAccountTickets(address account) external view returns (uint256[] memory);
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
    ) external returns (uint256);
}
