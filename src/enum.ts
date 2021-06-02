export enum SourceType {
  Table,
  Json,
}

export enum FaceRowType {
  NotSet = 0,
  Odd,
  Even,
}

export enum RenderType {
  none,
  append,
  replace,
}

export enum JoinType {
  innerjoin,
  leftjoin,
  rightjoin,
}

export enum Priority {
  higher,
  high,
  normal,
  Low,
  lower,
}
