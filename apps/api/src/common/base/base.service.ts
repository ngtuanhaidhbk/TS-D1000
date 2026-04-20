export abstract class BaseService {
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
}
