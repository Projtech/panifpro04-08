// Tipo para armazenar dados em cache com timestamp
export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Classe para gerenciar cache em memória
export class MemoryCache {
  private static cache = new Map<string, CacheItem<any>>();
  
  // Armazenar dados no cache
  static set<T>(key: string, data: T, expirationMinutes: number = 5): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (expirationMinutes * 60 * 1000)
    });
  }
  
  // Obter dados do cache
  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    // Se não existe ou expirou
    if (!item || Date.now() > item.timestamp) {
      if (item) this.cache.delete(key); // Limpar item expirado
      return null;
    }
    
    return item.data as T;
  }
  
  // Limpar um item específico
  static clear(key: string): void {
    this.cache.delete(key);
  }
  
  // Limpar todo o cache
  static clearAll(): void {
    this.cache.clear();
  }
}
