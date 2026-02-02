export const gameEngine = {
  async getGameConfig(type: string): Promise<any> {
    return { type, enabled: false, config: {} };
  },
};

export const jackpotService = {
  async toggleJackpot(jackpotId: string): Promise<any> {
    return { id: jackpotId, isActive: false, name: '', active: false };
  },

  async adminAdjustBalance(
    jackpotId: string,
    amount: number,
    _adminId: string,
    _reason?: string
  ): Promise<any> {
    return { id: jackpotId, name: '', balance: amount, newBalance: amount };
  },

  async triggerScheduledDrawing(jackpotId: string): Promise<any> {
    return { id: jackpotId, drawn: false, winner: null, amount: 0 };
  },

  async initializeJackpots(): Promise<void> {
    console.log('[Games] Jackpots initialized');
  },

  async getJackpotStatus(): Promise<any[]> {
    return [];
  },
};
