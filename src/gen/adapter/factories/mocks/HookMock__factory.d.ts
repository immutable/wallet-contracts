import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../common";
import type { HookMock, HookMockInterface } from "../../mocks/HookMock";
declare type HookMockConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class HookMock__factory extends ContractFactory {
    constructor(...args: HookMockConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<HookMock>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): HookMock;
    connect(signer: Signer): HookMock__factory;
    static readonly bytecode = "0x6080604052348015600f57600080fd5b5060af8061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063b68fe6cf14602d575b600080fd5b605660048036036020811015604157600080fd5b8101908080359060200190929190505050606c565b6040518082815260200191505060405180910390f35b600060028202905091905056fea264697066735822122072e21121382e1acb76573b1e8d5af223fcaf563f0bbb9962a8b60337cbb7f3b164736f6c63430007060033";
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
    static createInterface(): HookMockInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): HookMock;
}
export {};
