import type { BaseContract, BigNumber, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "../common";
export interface CustomModuleInterface extends utils.Interface {
    functions: {
        "getStr()": FunctionFragment;
        "setStr(string)": FunctionFragment;
        "str()": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "getStr" | "setStr" | "str"): FunctionFragment;
    encodeFunctionData(functionFragment: "getStr", values?: undefined): string;
    encodeFunctionData(functionFragment: "setStr", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "str", values?: undefined): string;
    decodeFunctionResult(functionFragment: "getStr", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setStr", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "str", data: BytesLike): Result;
    events: {};
}
export interface CustomModule extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: CustomModuleInterface;
    queryFilter<TEvent extends TypedEvent>(event: TypedEventFilter<TEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TEvent>>;
    listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
    listeners(eventName?: string): Array<Listener>;
    removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
    removeAllListeners(eventName?: string): this;
    off: OnEvent<this>;
    on: OnEvent<this>;
    once: OnEvent<this>;
    removeListener: OnEvent<this>;
    functions: {
        getStr(overrides?: CallOverrides): Promise<[string]>;
        setStr(_str: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        str(overrides?: CallOverrides): Promise<[string]>;
    };
    getStr(overrides?: CallOverrides): Promise<string>;
    setStr(_str: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    str(overrides?: CallOverrides): Promise<string>;
    callStatic: {
        getStr(overrides?: CallOverrides): Promise<string>;
        setStr(_str: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        str(overrides?: CallOverrides): Promise<string>;
    };
    filters: {};
    estimateGas: {
        getStr(overrides?: CallOverrides): Promise<BigNumber>;
        setStr(_str: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        str(overrides?: CallOverrides): Promise<BigNumber>;
    };
    populateTransaction: {
        getStr(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        setStr(_str: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        str(overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
