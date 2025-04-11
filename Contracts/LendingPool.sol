// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IRiskEngine {
    function getRiskScore(address user) external view returns (uint);
}

contract LendingPool {
    IRiskEngine public riskEngine;
    mapping(address => uint) public collateralBalance;
    mapping(address => uint) public debtBalance;

    constructor(address _riskEngine) {
        riskEngine = IRiskEngine(_riskEngine);
    }

    function deposit() external payable {
        collateralBalance[msg.sender] += msg.value;
    }

    function withdraw(uint amount) external {
        require(debtBalance[msg.sender] == 0, "Loan exists");
        require(collateralBalance[msg.sender] >= amount, "Too much");
        collateralBalance[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }

    function borrow(uint amount) external {
        uint risk = riskEngine.getRiskScore(msg.sender);
        uint limit = (collateralBalance[msg.sender] * risk) / 100;
        require(amount <= limit, "Exceeds limit");

        debtBalance[msg.sender] += amount;
        payable(msg.sender).transfer(amount);
    }

    function repay() external payable {
        require(debtBalance[msg.sender] >= msg.value, "Overpay");
        debtBalance[msg.sender] -= msg.value;
    }

    receive() external payable {}
}
