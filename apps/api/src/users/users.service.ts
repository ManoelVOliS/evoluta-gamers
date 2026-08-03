import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import type {
  AdminUpdateUserInput,
  PublicUser,
  UpdateProfileInput,
} from '@evoluta-gamers/shared'
import { User, type UserDocument } from './schemas/user.schema'

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null
    return this.model.findById(id).exec()
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email: email.toLowerCase().trim() }).exec()
  }

  async countAll(): Promise<number> {
    return this.model.estimatedDocumentCount().exec()
  }

  async create(data: {
    name: string
    email: string
    passwordHash: string
    role?: 'admin' | 'user'
    status?: 'pending' | 'active' | 'suspended'
  }): Promise<UserDocument> {
    return this.model.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      role: data.role ?? 'user',
      status: data.status ?? 'pending',
    })
  }

  async updateProfile(
    id: string,
    input: UpdateProfileInput,
  ): Promise<UserDocument> {
    const user = await this.model
      .findByIdAndUpdate(id, { $set: input }, { new: true })
      .exec()
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }

  /** Alterações privativas do admin: aprovar, suspender, trocar papel. */
  async adminUpdate(
    id: string,
    input: AdminUpdateUserInput,
  ): Promise<UserDocument> {
    const user = await this.model
      .findByIdAndUpdate(id, { $set: input }, { new: true })
      .exec()
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }

  async listAll(): Promise<UserDocument[]> {
    return this.model.find().sort({ createdAt: -1 }).exec()
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.model
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec()
    return Object.fromEntries(rows.map((r) => [r._id, r.count]))
  }

  async countWithSteam(): Promise<number> {
    return this.model.countDocuments({ steamId64: { $ne: null } }).exec()
  }

  async countFailedSyncs(): Promise<number> {
    return this.model.countDocuments({ lastSyncError: { $ne: null } }).exec()
  }

  async findBySteamId(steamId64: string): Promise<UserDocument | null> {
    return this.model.findOne({ steamId64 }).exec()
  }

  async linkSteam(
    id: string,
    data: { steamId64: string; personaName: string; avatarUrl: string | null },
  ): Promise<UserDocument> {
    const user = await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            steamId64: data.steamId64,
            steamPersonaName: data.personaName,
            steamAvatarUrl: data.avatarUrl,
          },
        },
        { new: true },
      )
      .exec()
    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }

  /** Desvincula sem apagar `user_games` — o histórico de zerados fica. */
  async unlinkSteam(id: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: id },
        {
          $set: {
            steamId64: null,
            steamPersonaName: null,
            steamAvatarUrl: null,
            lastSyncAt: null,
            lastSyncError: null,
          },
        },
      )
      .exec()
  }

  async recordSyncOutcome(
    id: string,
    outcome: { ok: boolean; error: string | null },
  ): Promise<void> {
    await this.model
      .updateOne(
        { _id: id },
        {
          $set: {
            lastSyncAt: new Date(),
            lastSyncError: outcome.ok ? null : outcome.error,
          },
        },
      )
      .exec()
  }

  static toPublic(user: UserDocument): PublicUser {
    const createdAt = (user as unknown as { createdAt?: Date }).createdAt
    return {
      id: user.id as string,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      status: user.status,
      steamId64: user.steamId64,
      lastSyncAt: user.lastSyncAt ? user.lastSyncAt.toISOString() : null,
      monthlyGoal: user.monthlyGoal,
      createdAt: (createdAt ?? new Date()).toISOString(),
    }
  }
}
