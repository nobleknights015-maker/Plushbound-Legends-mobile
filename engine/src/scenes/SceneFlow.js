export class SceneFlow {
  constructor(kernel) {
    this.kernel = kernel;
  }
  async title(scene, payload) { return this.kernel.replaceScene(scene, payload); }
  async newGame(scene, payload) { return this.kernel.replaceScene(scene, payload); }
  async openMenu(scene, payload) { return this.kernel.pushScene(scene, payload); }
  async closeMenu() { return this.kernel.popScene(); }
  async enterBattle(scene, payload) { return this.kernel.pushScene(scene, payload); }
  async leaveBattle() { return this.kernel.popScene(); }
  async transfer(scene, payload) { return this.kernel.replaceScene(scene, payload); }
}
