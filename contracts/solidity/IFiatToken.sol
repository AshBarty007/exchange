// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFiatToken {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external returns (bool);
    function burn(address from, uint256 amount) external returns (bool);
    function deposit(address subAccount, uint256 amount) external returns (bool);
    function withdraw(address to, uint256 amount) external returns (bool);
}
