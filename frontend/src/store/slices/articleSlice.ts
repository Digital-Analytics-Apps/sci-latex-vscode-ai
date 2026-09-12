import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ArticleState {
  selectedArticleId: string | null;
  activeTaskId: string | null;
  viewMode: "ARTICLES_LIST" | "ARTICLE_TASKS";
}

const initialState: ArticleState = {
  selectedArticleId: null,
  activeTaskId: null,
  viewMode: "ARTICLES_LIST",
};

export const articleSlice = createSlice({
  name: "article",
  initialState,
  reducers: {
    selectArticle: (state, action: PayloadAction<string | null>) => {
      state.selectedArticleId = action.payload;
      state.viewMode = action.payload ? "ARTICLE_TASKS" : "ARTICLES_LIST";
    },
    setActiveTask: (state, action: PayloadAction<string | null>) => {
      state.activeTaskId = action.payload;
    },
    clearSelectedArticle: (state) => {
      state.selectedArticleId = null;
      state.activeTaskId = null;
      state.viewMode = "ARTICLES_LIST";
    },
  },
});

export const { selectArticle, setActiveTask, clearSelectedArticle } =
  articleSlice.actions;
export default articleSlice.reducer;
