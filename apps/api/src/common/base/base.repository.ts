export abstract class BaseRepository<TEntity extends { id: string }> {
  protected readonly items = new Map<string, TEntity>();

  findById(id: string): TEntity | null {
    return this.items.get(id) ?? null;
  }

  list(): TEntity[] {
    return [...this.items.values()];
  }

  save(entity: TEntity): TEntity {
    this.items.set(entity.id, entity);
    return entity;
  }

  deleteById(id: string): boolean {
    return this.items.delete(id);
  }
}
