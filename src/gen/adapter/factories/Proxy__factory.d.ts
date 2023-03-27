import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../common";
import type { Proxy, ProxyInterface } from "../Proxy";
type ProxyConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class Proxy__factory extends ContractFactory {
    constructor(...args: ProxyConstructorParams);
    deploy(_implementation: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<Proxy>;
    getDeployTransaction(_implementation: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): Proxy;
    connect(signer: Signer): Proxy__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b5060405161029f38038061029f8339818101604052810190610032919061009e565b803055506100cb565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061006b82610040565b9050919050565b61007b81610060565b811461008657600080fd5b50565b60008151905061009881610072565b92915050565b6000602082840312156100b4576100b361003b565b5b60006100c284828501610089565b91505092915050565b6101c5806100da6000396000f3fe6080604052600436106100225760003560e01c806390611127146100a857610076565b36610076573373ffffffffffffffffffffffffffffffffffffffff16347f606834f57405380c4fb88d1f4850326ad3885f014bab3b568dfbf7a041eef73860405161006c90610113565b60405180910390a3005b60006100806100d3565b90503660008037600080366000845af43d6000803e80600081146100a3573d6000f35b3d6000fd5b3480156100b457600080fd5b506100bd6100d3565b6040516100ca9190610174565b60405180910390f35b60003054905090565b600082825260208201905092915050565b50565b60006100fd6000836100dc565b9150610108826100ed565b600082019050919050565b6000602082019050818103600083015261012c816100f0565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061015e82610133565b9050919050565b61016e81610153565b82525050565b60006020820190506101896000830184610165565b9291505056fea2646970667358221220dbec40c17480d9ed24344482bbbad151a46f9e1624fb215ee33d35f1b592721d64736f6c63430008110033";
    static readonly abi: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_implementation";
            readonly type: "address";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "constructor";
    }, {
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: true;
            readonly internalType: "uint256";
            readonly name: "value";
            readonly type: "uint256";
        }, {
            readonly indexed: true;
            readonly internalType: "address";
            readonly name: "sender";
            readonly type: "address";
        }, {
            readonly indexed: false;
            readonly internalType: "bytes";
            readonly name: "data";
            readonly type: "bytes";
        }];
        readonly name: "Received";
        readonly type: "event";
    }, {
        readonly stateMutability: "payable";
        readonly type: "fallback";
    }, {
        readonly inputs: readonly [];
        readonly name: "PROXY_getImplementation";
        readonly outputs: readonly [{
            readonly internalType: "address";
            readonly name: "implementation";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly stateMutability: "payable";
        readonly type: "receive";
    }];
    static createInterface(): ProxyInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): Proxy;
}
export {};
