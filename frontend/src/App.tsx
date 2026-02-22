import React, { useState, useEffect, useRef } from "react";

import { Article, ArticleItem } from "./components/articles";

const parseJSON = (response: any) => {
  return new Promise((resolve) =>
    response.json().then((data: any) =>
      resolve({
        status: response.status,
        ok: response.ok,
        data,
      })
    )
  );
};

const request = (url: string, options: any) => {
  //https://github.com/github/fetch/issues/203#issuecomment-266034180
  return new Promise((resolve, reject) => {
    return fetch(url, options)
      .then(parseJSON)
      .then((res: any) => {
        if (res.ok) {
          return resolve(res);
        }
        return reject({
          ok: false,
          status: res.status,
          message: res.data.message,
        });
      })
      .catch((error) =>
        reject({
          ok: false,
          status: null,
          message: error.message,
        })
      );
  });
};

const App: React.FC = () => {
  const [articleLimit, setArticleLimit] = useState<number>(30);
  const [allArticles, setArticles]: [Article[], Function] = useState([]);
  const [isFetching, setIsFetching]: [boolean, Function] = useState(false);
  const [errorMessage, setErrorMessage]: [string, Function] = useState("");
  const [isError, setIsError] = useState(false);
  const hasFetched = useRef(false);

  const setError = (msg: string) => {
    setErrorMessage(msg);
    setIsError(true);
  };
  const clearError = () => {
    setErrorMessage("");
    setIsError(false);
  };

  const updateArticleLimit = (newLimit: number) => {
    const [MIN, MAX]: number[] = [5, 50];
    const limit = Math.min(MAX, Math.max(MIN, newLimit));
    setArticleLimit(limit);
    localStorage.setItem("articleLimit", limit.toString());
  };

  useEffect(() => {
    const limit: null | string = localStorage.getItem("articleLimit");
    if (limit !== null && parseInt(limit, 10)) {
      updateArticleLimit(parseInt(limit, 10));
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchArticles();
  }, []);

  const fetchArticles = () => {
    clearError();
    setIsFetching(true);
    return request(`/api/articles?offset=0&limit=${articleLimit}`, {})
      .then((res: any) => {
        const { articles }: { articles: Article[] } = res.data;
        if (articles && articles.length === 0) {
          setErrorMessage("No more articles.");
        }
        setArticles((existing: Article[]) => articles);
      })
      .catch((error) => {
        const { status, message } = error || {};
        const effectiveMessage =
          message ||
          (status
            ? `Request failed with status ${status}.`
            : "Request failed. Please try again.");
        setError(effectiveMessage);
      })
      .then(() => setIsFetching(false));
  };


  const handleClick = (id: string) => {
    const article = allArticles.find((a) => a.id === id);
    setArticles((existing: Article[]) => existing.filter((a) => a.id !== id));
    if (allArticles.length === 1) {
      setErrorMessage("No more articles.");
    }
    request(`/api/articles/${id}`, { method: "DELETE" }).catch((error) => {
      const { status, message } = error || {};
      const effectiveMessage =
        message ||
        (status
          ? `Failed to archive article (status ${status}).`
          : "Failed to archive article. Check API.");
      if (article) {
        setArticles((existing: Article[]) => [article, ...existing]);
      }
      setError(effectiveMessage);
    });
  };

  const handleRetry = () => {
    fetchArticles();
  };

  const LimitSection = () => {
    const [value, setValue] = useState(articleLimit);

    const handleKeyUp = (event: any) => {
      event.key === "Enter" && updateArticleLimit(value);
    };

    const onChange = (e: any) => setValue(e.target.value);

    return (
      <p className="flex-grow-0 sm:w-2/3 md:w-1/2 text-center bg-orange-500 font-bold mt-4">
        Application will attempt to retrieve
        <input
          onKeyUp={handleKeyUp}
          onChange={onChange}
          className="bg-orange-500 underline w-5 mx-1 cursor-pointer"
          type="text"
          value={value}
        />
        articles untill exhausted.
      </p>
    );
  };

  return (
    <div className="h-screen flex items-center flex-col font-mono p-1">
      <div className="flex-grow-0 sm:w-2/3 md:w-1/2 text-center bg-orange-500 uppercase font-bold mt-4">
        $ WELCOME TO READWISE RETRO
      </div>
      <LimitSection />
      <div className="flex-grow flex-shrink-0 flex flex-col sm:w-2/3 md:w-1/2 border-orange-500 mt-4 p-2 border-2 mb-4">
        {isError ? (
          <div className="text-orange-500 flex flex-col items-center justify-center h-full">
            <div className="font-thin mb-3">{errorMessage}</div>
            <button
              onClick={handleRetry}
              type="button"
              className="border border-orange-500 px-3 py-1 uppercase font-bold tracking-wide hover:bg-orange-500 hover:text-black"
            >
              Retry
            </button>
          </div>
        ) : isFetching ? (
          <div className="text-orange-500 font-thin">Loading...</div>
        ) : (
          <>
            {allArticles.map((article: Article) => (
              <ArticleItem
                key={article.id}
                article={article}
                handleClick={handleClick}
              />
            ))}
            {errorMessage && (
              <div className="text-orange-500 font-thin">{errorMessage}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
