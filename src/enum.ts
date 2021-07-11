export enum OriginType {
  internal,
  external,
}

export enum FaceRowType {
  NotSet = 0,
  Odd,
  Even,
}

export enum MergeType {
  replace,
  append,
}

export enum JoinType {
  innerjoin,
  leftjoin,
  rightjoin,
}

export enum Priority {
  high,
  normal,
  low,
  none,
}
