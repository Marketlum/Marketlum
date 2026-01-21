"use client"

import { useEffect, useState } from "react";

const ValuePage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/value/fe22a151-3142-464f-a556-c934293c275d")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h1>{data.id}</h1>
      <p>{data.name}</p>
    </div>
  );
};

export default ValuePage;
