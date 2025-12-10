import addressRepository, { IAddressRepository } from '../repositories/address.repository';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';
import addressTransformer from '../utils/transformers/address.transformer';
import { IAddress } from '../models/address.model';
import { ServiceResponse } from '../types/service.types';

export interface IAddressService {
  addAddress(userId: string, addressData: Partial<IAddress>): Promise<ServiceResponse<any>>;
  listAddressesSummary(userId: string): Promise<ServiceResponse<any[]>>;
  getAddressDetails(addressId: string, userId: string): Promise<ServiceResponse<any>>;
  updateAddress(
    addressId: string,
    userId: string,
    updateData: Partial<IAddress>
  ): Promise<ServiceResponse<any>>;
  removeAddress(addressId: string, userId: string): Promise<ServiceResponse<null>>;
}

export class AddressService implements IAddressService {
  constructor(private addressRepository: IAddressRepository) {}

  async addAddress(userId: string, addressData: Partial<IAddress>) {
    const address = await this.addressRepository.createAddress({
      ...addressData,
      userId: new Types.ObjectId(userId),
    });

    return {
      data: addressTransformer.detailed(address),
      message: 'Endereço adicionado com sucesso.',
      details: null,
    };
  }

  async listAddressesSummary(userId: string) {
    const addresses = await this.addressRepository.findAllAddressesByUserIdSummary(userId);
    const quantity = addresses.length;

    return {
      data: addresses.map(addressTransformer.detailed),
      message: 'Endereços retornados com sucesso',
      details: { totalItens: quantity },
    };
  }

  async getAddressDetails(addressId: string, userId: string) {
    const address = await this.addressRepository.findAddressByIdAndUserIdDetail(addressId, userId);
    if (!address)
      {throw new AppError('Endereço não encontrado ou não pertence a este usuário.', 404);}
    return {
      data: addressTransformer.detailed(address),
      message: 'Detalhes do endereço obtidos com sucesso.',
      details: null,
    };
  }

  async updateAddress(addressId: string, userId: string, updateData: Partial<IAddress>) {
    const address = await this.addressRepository.updateAddress(addressId, userId, updateData);
    if (!address)
      {throw new AppError('Endereço não encontrado ou não pertence a este usuário.', 404);}
    return {
      data: addressTransformer.detailed(address),
      message: 'Endereço atualizado com sucesso.',
      details: null,
    };
  }

  async removeAddress(addressId: string, userId: string) {
    const deleted = await this.addressRepository.deleteAddress(addressId, userId);
    if (!deleted)
      {throw new AppError('Endereço não encontrado ou não pertence a este usuário.', 404);}
    return {
      data: null,
      message: 'Endereço removido com sucesso.',
      details: null,
    };
  }
}

export default new AddressService(addressRepository);
