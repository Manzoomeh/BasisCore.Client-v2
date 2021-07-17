import FaceRenderResult from "./FaceRenderResult";

export default class FaceRenderResultList<T extends FaceRenderResult> {
  private readonly groups: Map<string, Map<any, T>> = new Map<
    string,
    Map<any, T>
  >();

  public set(key: any, value: T, groupName: string = "default") {
    let group = this.groups[groupName];
    if (!group) {
      group = new Map<any, T>();
      this.groups[groupName] = group;
    }
    group.set(key ?? value, value);
  }

  public getGroup(groupName: string = "default"): Map<any, T> | undefined {
    return this.groups[groupName];
  }

  public get(key: any, groupName: string = "default"): T | undefined {
    return this.getGroup(groupName).get(key);
  }

  public size(groupName: string = "default"): number {
    return this.getGroup(groupName).size;
  }
}
