// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/// @title MockCallReceiver
/// @notice Mock contract to receive and track calls from executor tests
/// @dev Used to verify that executeFromExecutor properly executes transactions
contract MockCallReceiver {
    // State variables to track calls
    uint256 public callCount;
    address public lastCaller;
    uint256 public lastValue;
    bytes public lastData;
    
    // Events for testing
    event CallReceived(address caller, uint256 value, bytes data, uint256 callNumber);
    event BatchCallReceived(address caller, uint256 totalCalls);

    /// @notice Receives a simple call and records the details
    function receiveCall(bytes calldata data) external payable {
        callCount++;
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastData = data;
        
        emit CallReceived(msg.sender, msg.value, data, callCount);
    }

    /// @notice Receives a call with specific parameters for testing
    function receiveCallWithParams(uint256 param1, string calldata param2) external payable {
        callCount++;
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastData = abi.encode(param1, param2);
        
        emit CallReceived(msg.sender, msg.value, lastData, callCount);
    }

    /// @notice Simulates a failing call for error testing
    function failingCall() external pure {
        revert("MockCallReceiver: Intentional failure");
    }

    /// @notice Resets the state for fresh testing
    function reset() external {
        callCount = 0;
        lastCaller = address(0);
        lastValue = 0;
        lastData = "";
    }

    /// @notice Returns the current state for assertions
    function getState() external view returns (
        uint256 _callCount,
        address _lastCaller,
        uint256 _lastValue,
        bytes memory _lastData
    ) {
        return (callCount, lastCaller, lastValue, lastData);
    }

    /// @notice Allows the contract to receive ETH
    receive() external payable {
        callCount++;
        lastCaller = msg.sender;
        lastValue = msg.value;
        lastData = "";
        
        emit CallReceived(msg.sender, msg.value, "", callCount);
    }
}
