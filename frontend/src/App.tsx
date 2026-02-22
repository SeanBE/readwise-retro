import React, { useState, useEffect } from "react";

import { Form } from "./components/forms";
import { Article, ArticleItem } from "./components/articles";

type BlockingErrorProps = {
  message: string;
  onConfirm: () => void;
};

const BlockingErrorDialog: React.FC<BlockingErrorProps> = ({
  message,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
    <div className="bg-gray-900 border border-orange-500 text-orange-500 px-6 py-4 w-11/12 max-w-md shadow-lg">
      <p className="mb-4 text-center">{message}</p>
      <button
        className="w-full border border-orange-500 px-3 py-2 uppercase font-bold tracking-wide"
        onClick={onConfirm}
        autoFocus
        type="button"
      >
        Confirm
      </button>
    </div>
  </div>
);

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
  const [consumerKey, setConsumerKey] = useState<null | string>(null);
  const [allArticles, setArticles]: [Article[], Function] = useState([]);
  const [isFetching, setIsFetching]: [boolean, Function] = useState(false);
  const [errorMessage, setErrorMessage]: [string, Function] = useState("");
  const [isAuthenticated, setIsAuthenticated]: [boolean, Function] =
    useState(true);
  const [blockingErrorMessage, setBlockingErrorMessage] = useState<
    string | null
  >(null);

  const urlParams = new URLSearchParams(window.location.search);
  const isRedirected = urlParams.get("callback") !== null;

  const updateArticleLimit = (newLimit: number) => {
    const [MIN, MAX]: number[] = [5, 50];
    const limit = Math.min(MAX, Math.max(MIN, newLimit));
    setArticleLimit(limit);
    localStorage.setItem("articleLimit", limit.toString());
  };

  const removeKey = () => {
    setConsumerKey(null);
    setIsAuthenticated(false);
    localStorage.removeItem("consumerKey");
  };

  useEffect(() => {
    const key = localStorage.getItem("consumerKey");
    if (key !== null) {
      setConsumerKey(key);
    }
    const limit: null | string = localStorage.getItem("articleLimit");
    if (limit !== null && parseInt(limit, 10)) {
      updateArticleLimit(parseInt(limit, 10));
    }
  }, []);

  useEffect(() => {
    if (allArticles.length > 0 && articleLimit !== allArticles.length) {
      fetchArticles();
    }
  }, [articleLimit]);

  useEffect(() => {
    // on consumerKey changes. runs multiple times here..
    if (consumerKey !== null) {
      setConsumerKey(consumerKey);
      localStorage.setItem("consumerKey", consumerKey);
      setIsAuthenticated(true);
    }
  }, [consumerKey]);

  useEffect(() => {
    if (consumerKey !== null && !isAuthenticated) {
      if (!isRedirected) {
        const callbackURL = new URL(window.location.href);
        callbackURL.searchParams.append("callback", "");
        const formData = new FormData();
        formData.append("consumer_key", consumerKey);
        formData.append("redirect_uri", callbackURL.toString());
        request(`/api/oauth/request`, { method: "POST", body: formData })
          .then((res: any) => {
            const link = res.data["link"];
            window.open(link);
          })
          .catch((_) => {
            setErrorMessage("Failed to authenticate");
          });
      } else {
        request(`/api/oauth/authorize`, { method: "POST" })
          .then((res: any) => {
            setIsAuthenticated(true);
          })
          .catch((e) => {
            console.log(e);
            setErrorMessage(
              "Request token was not authorized to obtain access token"
            );
          });
      }
    }
  }, [consumerKey, isAuthenticated]);

  useEffect(() => {
    if (
      allArticles.length !== 0 ||
      errorMessage ||
      !isAuthenticated ||
      consumerKey === null
    )
      return;
    setIsFetching(true);
  }, [allArticles, errorMessage, isAuthenticated, consumerKey]);

  const fetchArticles = () => {
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
        setBlockingErrorMessage(effectiveMessage);
        if (status === 403) {
          setIsAuthenticated(false);
        }
        setErrorMessage(effectiveMessage);
      })
      .then(() => setIsFetching(false));
  };

  useEffect(() => {
    isFetching && fetchArticles();
  }, [isFetching]);

  const handleClick = (id: string) => {
    // list will only contain at most 10 elements so filter is fine.
    setArticles((existing: Article[]) => existing.filter((a) => a.id !== id));
    request(`/api/articles/${id}`, { method: "DELETE" }).catch((error) => {
      const { status, message } = error || {};
      const effectiveMessage =
        message ||
        (status
          ? `Failed to archive article (status ${status}).`
          : "Failed to archive article. Check API.");
      setBlockingErrorMessage(effectiveMessage);
      setErrorMessage(effectiveMessage);
    });
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
      {blockingErrorMessage && (
        <BlockingErrorDialog
          message={blockingErrorMessage}
          onConfirm={() => setBlockingErrorMessage(null)}
        />
      )}
      <div className="flex-grow-0 sm:w-2/3 md:w-1/2 text-center bg-orange-500 uppercase font-bold mt-4">
        $ WELCOME TO POCKET RETRO
      </div>
      <LimitSection />
      <div className="flex-grow flex-shrink-0 sm:w-2/3 md:w-1/2 border-orange-500 mt-4 p-2 border-2 mb-4">
        {allArticles.map((article: Article) => (
          <ArticleItem
            key={article.id}
            article={article}
            handleClick={handleClick}
          />
        ))}
        {consumerKey === null && <Form submitValue={setConsumerKey} />}
        {!isAuthenticated && consumerKey && (
          <div className="text-orange-500 font-thin font-base">
            Attempting to Authenticate...
          </div>
        )}
        {isAuthenticated && isFetching && (
          <div className="text-orange-500 font-thin font-base">Loading...</div>
        )}
        {errorMessage && (
          <div className="text-orange-500 font-thin font-base">
            {errorMessage}{" "}
            <span style={{ cursor: "pointer" }} onClick={removeKey}>
              {"(Reset consumer key?)"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
