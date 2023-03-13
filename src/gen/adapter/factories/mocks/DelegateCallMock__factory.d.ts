import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { DelegateCallMock, DelegateCallMockInterface } from "../../mocks/DelegateCallMock";
declare type DelegateCallMockConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class DelegateCallMock__factory extends ContractFactory {
    constructor(...args: DelegateCallMockConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<DelegateCallMock>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): DelegateCallMock;
    connect(signer: Signer): DelegateCallMock__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b50610278806100206000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063381ba140146100465780639c0e3f7a14610076578063ed2e5a97146100ae575b600080fd5b6100746004803603602081101561005c57600080fd5b810190808035151590602001909291905050506100dc565b005b6100ac6004803603604081101561008c57600080fd5b81019080803590602001909291908035906020019092919050505061012a565b005b6100da600480360360208110156100c457600080fd5b81019080803590602001909291905050506101d3565b005b806100e85760006100eb565b60015b60ff166000807f6108217547eb0f6456375f9cad1dc0e5578e94c4334120e3e36fa8a89e5462ce60001c81526020019081526020016000208190555050565b60008060007f6108217547eb0f6456375f9cad1dc0e5578e94c4334120e3e36fa8a89e5462ce60001c815260200190815260200160002054146101b8576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260238152602001806102206023913960400191505060405180910390fd5b80600080848152602001908152602001600020819055505050565b7fbc729c7b482904bbcfeab92d0354ccfb7a805b45b9c1f13b723d751d99ac70ff600080838152602001908152602001600020546040518082815260200191505060405180910390a15056fe44656c656761746543616c6c4d6f636b2377726974653a205245564552545f464c4147a26469706673582212208577b462ed5e1f96277435c31972cb6ff1e0f1ffd9f1d695eea0c1f9e3f6669564736f6c63430007060033";
    static readonly abi: ({
        anonymous: boolean;
        inputs: {
            indexed: boolean;
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        type: string;
        outputs?: undefined;
        stateMutability?: undefined;
    } | {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: never[];
        stateMutability: string;
        type: string;
        anonymous?: undefined;
    })[];
    static createInterface(): DelegateCallMockInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): DelegateCallMock;
}
export {};
