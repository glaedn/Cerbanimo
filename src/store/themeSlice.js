import { createSlice } from '@reduxjs/toolkit';

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: 'default', // 'default' or 'magicalGirl'
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'default' ? 'magicalGirl' : 'default';
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
    }
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
