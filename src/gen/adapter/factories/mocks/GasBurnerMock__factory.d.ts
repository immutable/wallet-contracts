import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { GasBurnerMock, GasBurnerMockInterface } from "../../mocks/GasBurnerMock";
type GasBurnerMockConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class GasBurnerMock__factory extends ContractFactory {
    constructor(...args: GasBurnerMockConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<GasBurnerMock>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): GasBurnerMock;
    connect(signer: Signer): GasBurnerMock__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b50610107806100206000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c80634ad5d16f14602d575b600080fd5b605660048036036020811015604157600080fd5b81019080803590602001909291905050506058565b005b7fb5769a7bae701ca7bcd4ed2e803959a466a236728fcb0dc25fa836e3a38bc2225a6040518082815260200191505060405180910390a16000805a90505b825a8203101560cc5781604051602001808281526020019150506040516020818303038152906040528051906020012091506096565b50505056fea264697066735822122014f287f61da59a1501b6ff25834b5ba7e7ba5015f7e540e3acb77c108281945a64736f6c63430007060033";
    static readonly abi: readonly [{
        readonly anonymous: false;
        readonly inputs: readonly [{
            readonly indexed: false;
            readonly internalType: "uint256";
            readonly name: "_val";
            readonly type: "uint256";
        }];
        readonly name: "ProvidedGas";
        readonly type: "event";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "_burn";
            readonly type: "uint256";
        }];
        readonly name: "burnGas";
        readonly outputs: readonly [];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }];
    static createInterface(): GasBurnerMockInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): GasBurnerMock;
}
export {};
