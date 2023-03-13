import { Signer, ContractFactory, Overrides } from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type { PromiseOrValue } from "../../../common";
import type { ModuleUpdate, ModuleUpdateInterface } from "../../../modules/commons/ModuleUpdate";
declare type ModuleUpdateConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ModuleUpdate__factory extends ContractFactory {
    constructor(...args: ModuleUpdateConstructorParams);
    deploy(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ModuleUpdate>;
    getDeployTransaction(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): TransactionRequest;
    attach(address: string): ModuleUpdate;
    connect(signer: Signer): ModuleUpdate__factory;
    static readonly bytecode = "0x608060405234801561001057600080fd5b506103b6806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c806301ffc9a71461003b578063025b22bc1461009e575b600080fd5b6100866004803603602081101561005157600080fd5b8101908080357bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191690602001909291905050506100e2565b60405180821515815260200191505060405180910390f35b6100e0600480360360208110156100b457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050610164565b005b60007f025b22bc000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19161415610153576001905061015f565b61015c826102b5565b90505b919050565b3073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146101e8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252602781526020018061035a6027913960400191505060405180910390fd5b6102078173ffffffffffffffffffffffffffffffffffffffff16610306565b61025c576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260398152602001806103216039913960400191505060405180910390fd5b6102658161031a565b7f310ba5f1d2ed074b51e2eccd052a47ae9ab7c6b800d1fca3db3999d6a592ca0381604051808273ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390a150565b60006301ffc9a760e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b600080823b90506000811415915050919050565b8030555056fe4d6f64756c6555706461746523757064617465496d706c656d656e746174696f6e3a20494e56414c49445f494d504c454d454e544154494f4e4d6f64756c6553656c6641757468236f6e6c7953656c663a204e4f545f415554484f52495a4544a2646970667358221220794acce065d742174cd5a6b7955b60ef9db3713c576896e683f497d7c97a450b64736f6c63430007060033";
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
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
        anonymous?: undefined;
    })[];
    static createInterface(): ModuleUpdateInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): ModuleUpdate;
}
export {};
