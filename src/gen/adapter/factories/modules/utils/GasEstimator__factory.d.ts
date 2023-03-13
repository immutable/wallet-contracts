import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type { GasEstimator, GasEstimatorInterface } from "../../../modules/utils/GasEstimator";
declare type GasEstimatorConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class GasEstimator__factory extends ContractFactory {
    constructor(...args: GasEstimatorConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<GasEstimator>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): GasEstimator;
    connect(signer: Signer): GasEstimator__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b5061021a806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80630eb34cd314610030575b600080fd5b6100c76004803603604081101561004657600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019064010000000081111561008357600080fd5b82018360208201111561009557600080fd5b803590602001918460018302840111640100000000831117156100b757600080fd5b9091929391929390505050610152565b60405180841515815260200180602001838152602001828103825284818151815260200191508051906020019080838360005b838110156101155780820151818401526020810190506100fa565b50505050905090810190601f1680156101425780820380516001836020036101000a031916815260200191505b5094505050505060405180910390f35b600060606000805a90508673ffffffffffffffffffffffffffffffffffffffff1686866040518083838082843780830192505050925050506000604051808303816000865af19150503d80600081146101c7576040519150601f19603f3d011682016040523d82523d6000602084013e6101cc565b606091505b5080945081955050505a81039150509350935093905056fea2646970667358221220dae5d5fcb5dd3f519be89b685e87eaac4e1239469b6fdeae988872be9805238f64736f6c63430007060033";
    static readonly abi: {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    }[];
    static createInterface(): GasEstimatorInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): GasEstimator;
}
export {};
