import { Signer, ContractFactory, PayableOverrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { CallReceiverMock, CallReceiverMockInterface } from "../../mocks/CallReceiverMock";
type CallReceiverMockConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class CallReceiverMock__factory extends ContractFactory {
    constructor(...args: CallReceiverMockConstructorParams);
    deploy(overrides?: PayableOverrides & {
        from?: PromiseOrValue<string>;
    }): Promise<CallReceiverMock>;
    getDeployTransaction(overrides?: PayableOverrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): CallReceiverMock;
    connect(signer: Signer): CallReceiverMock__factory;
    static readonly bytecode = "0x608060405261040b806100136000396000f3fe60806040526004361061003f5760003560e01c8063381ba14014610044578063ad387c8a14610081578063c0aec4d314610104578063ebd35e471461012f575b600080fd5b34801561005057600080fd5b5061007f6004803603602081101561006757600080fd5b810190808035151590602001909291905050506101bf565b005b6101026004803603604081101561009757600080fd5b8101908080359060200190929190803590602001906401000000008111156100be57600080fd5b8201836020820111156100d057600080fd5b803590602001918460018302840111640100000000831117156100f257600080fd5b90919293919293905050506101dc565b005b34801561011057600080fd5b50610119610260565b6040518082815260200191505060405180910390f35b34801561013b57600080fd5b50610144610266565b6040518080602001828103825283818151815260200191508051906020019080838360005b83811015610184578082015181840152602081019050610169565b50505050905090810190601f1680156101b15780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b80600260006101000a81548160ff02191690831515021790555050565b600260009054906101000a900460ff1615610242576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260268152602001806103b06026913960400191505060405180910390fd5b8260008190555081816001919061025a929190610304565b50505050565b60005481565b60018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156102fc5780601f106102d1576101008083540402835291602001916102fc565b820191906000526020600020905b8154815290600101906020018083116102df57829003601f168201915b505050505081565b828054600181600116156101000203166002900490600052602060002090601f01602090048101928261033a5760008555610381565b82601f1061035357803560ff1916838001178555610381565b82800160010185558215610381579182015b82811115610380578235825591602001919060010190610365565b5b50905061038e9190610392565b5090565b5b808211156103ab576000816000905550600101610393565b509056fe43616c6c52656365697665724d6f636b237465737443616c6c3a205245564552545f464c4147a26469706673582212201f573dda0fd21359bb257afce90da148d2dc7847f139d3692eebffd48abd3f6364736f6c63430007060033";
    static readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly stateMutability: "payable";
        readonly type: "constructor";
    }, {
        readonly inputs: readonly [];
        readonly name: "lastValA";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "lastValB";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "";
            readonly type: "bytes";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bool";
            readonly name: "_revertFlag";
            readonly type: "bool";
        }];
        readonly name: "setRevertFlag";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "_valA";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "_valB";
            readonly type: "bytes";
        }];
        readonly name: "testCall";
        readonly outputs: readonly [];
        readonly stateMutability: "payable";
        readonly type: "function";
    }];
    static createInterface(): CallReceiverMockInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): CallReceiverMock;
}
export {};
