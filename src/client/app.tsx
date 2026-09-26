import { SubmitEvent } from "react";
import { useState } from "react";
import { Json } from "../shared/net";
import { accountRoute } from "../shared/apiRoutes";

function Ui({ title }: { title: string }) {
    const [data, setData] = useState({} as Json);
    const [count, setCount] = useState(0);

    async function handleSubmission(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch(`${accountRoute}/${formData.get("username")}`, {
                method: "GET",
            });

            if (res.ok) {
                setData(await res.json());
                e.target.reset();
            } else {
                setData("request failed qwq");
            }
        } catch (e) {
            setData("ono... qwq...");
        }
    }

    const r = <>
        <button onClick={() => setCount(count + 1)}>{title} {count}</button>

        <form onSubmit={handleSubmission}>
            <label>
                Username To Find:
                <input type="text" name="username" autoComplete="username"></input>
            </label>

            <label>
                Data:
            </label>

            <label>
                {JSON.stringify(data)}
            </label>

            <button type="submit">Submit</button>
        </form>
    </>;

    return r;
}

export function App() {
    return (
        <>
            <div>
            <h1>Welcome to my app</h1>
            <Ui title="Press count:"/>
            </div>
        </>
    );
}
