import IDataSource from "../data/IDataSource";
import { EventHandler } from "../event/EventHandler";

export default interface IRepository {
  setSource(source: IDataSource);
  addHandler(handler: EventHandler<IDataSource>);
  get(dataSourceId: string): IDataSource;
}
