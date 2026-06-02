// 批次審核的目標解析（純函式，便於測試）
//
// 規則：
//   - approve / reject：只對「待審核（pending）」的選取生效（已採納/已加入/已拒絕的不再動）
//   - delete：對全部選取生效

export type BatchAction = 'approve' | 'reject' | 'delete';

export function resolveBatchTargets(
    action: BatchAction,
    selectedIds: Iterable<string>,
    statusById: Map<string, string>,
): string[] {
    const ids = Array.from(selectedIds);
    if (action === 'delete') return ids;
    return ids.filter((id) => statusById.get(id) === 'pending');
}
