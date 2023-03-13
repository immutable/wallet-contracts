import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../../common";
import type { RequireFreshSigner, RequireFreshSignerInterface } from "../../../../modules/utils/libs/RequireFreshSigner";
declare type RequireFreshSignerConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class RequireFreshSigner__factory extends ContractFactory {
    constructor(...args: RequireFreshSignerConstructorParams);
    deploy(_requireUtils: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<RequireFreshSigner>;
    getDeployTransaction(_requireUtils: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): RequireFreshSigner;
    connect(signer: Signer): RequireFreshSigner__factory;
    static readonly bytecode = "0x60a060405234801561001057600080fd5b506040516102ff3803806102ff8339818101604052602081101561003357600080fd5b81019080805190602001909291905050508073ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff1660601b815250505060805160601c61026261009d6000398060b752806101d252506102626000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80630df0c4191461003b578063cfc63a491461007f575b600080fd5b61007d6004803603602081101561005157600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506100b3565b005b6100876101d0565b604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b60007f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff16631cd05dc4836040518263ffffffff1660e01b8152600401808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060206040518083038186803b15801561013c57600080fd5b505afa158015610150573d6000803e3d6000fd5b505050506040513d602081101561016657600080fd5b8101908080519060200190929190505050146101cd576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260388152602001806101f56038913960400191505060405180910390fd5b50565b7f00000000000000000000000000000000000000000000000000000000000000008156fe5265717569726546726573685369676e6572237265717569726546726573685369676e65723a204455504c4943415445445f5349474e4552a26469706673582212206078f568014eff931048f4ae18a611c215a2377d86a160dea8066241661601d064736f6c63430007060033";
    static readonly abi: ({
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
        name?: undefined;
        outputs?: undefined;
    } | {
        inputs: never[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
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
    })[];
    static createInterface(): RequireFreshSignerInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): RequireFreshSigner;
}
export {};
