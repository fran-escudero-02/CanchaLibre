import "@testing-library/jest-dom/vitest";

// Limpia localStorage entre tests para que el AuthContext arranque limpio.
beforeEach(() => {
  localStorage.clear();
});
