function getOTBoardSelection(product, form = {}) {
  const variant = product?.otBoards?.find(board => board.id === form.otBoardId);
  const board = form.otBoard || variant?.board;
  if (!board) return null;
  return {
    board,
    name: board.uploadedArtwork?.name || form.otBoardName || variant?.name || "",
    location: board.uploadedArtwork ? "" : form.otBoardLocation || variant?.location || "",
    unitPrice: board.uploadedArtwork ? undefined : variant?.unitPrice
  };
}

module.exports = {getOTBoardSelection};
