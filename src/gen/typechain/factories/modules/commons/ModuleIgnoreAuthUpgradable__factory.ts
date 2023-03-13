/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  ModuleIgnoreAuthUpgradable,
  ModuleIgnoreAuthUpgradableInterface,
} from "../../../modules/commons/ModuleIgnoreAuthUpgradable";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bytes32",
        name: "newImageHash",
        type: "bytes32",
      },
    ],
    name: "ImageHashUpdated",
    type: "event",
  },
  {
    inputs: [],
    name: "imageHash",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_hash",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "_signatures",
        type: "bytes",
      },
    ],
    name: "isValidSignature",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes",
        name: "_data",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "_signatures",
        type: "bytes",
      },
    ],
    name: "isValidSignature",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "_interfaceID",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "_imageHash",
        type: "bytes32",
      },
    ],
    name: "updateImageHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export class ModuleIgnoreAuthUpgradable__factory {
  static readonly abi = _abi;
  static createInterface(): ModuleIgnoreAuthUpgradableInterface {
    return new utils.Interface(_abi) as ModuleIgnoreAuthUpgradableInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): ModuleIgnoreAuthUpgradable {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as ModuleIgnoreAuthUpgradable;
  }
}
