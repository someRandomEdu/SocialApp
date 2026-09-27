import { SubmitEvent } from "react";
import { useState } from "react";
import { Json } from "../shared/net";
import { accountRoute } from "../shared/apiRoutes";
import { Account, accountPublicSchema } from "../shared/account";

function Ui() {
    const [count, setCount] = useState(0);
    const [accountDisplayElem, setAccountDisplayElem] = useState(<></>);

    async function handleSubmission(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch(`${accountRoute}/${formData.get("username")}`, {
                method: "GET",
            });

            if (res.ok) {
                const json: Json = await res.json();
                console.log(json);
                const a = accountPublicSchema.safeParse(json);

                if (a.success) {
                    setAccountDisplayElem(<>
                        <div>{a.data.username}</div>
                        <div>{a.data.bio}</div>
                        <div>{String(a.data.createdAt)}</div>
                    </>);
                } else {
                    setAccountDisplayElem(<>
                        Error occurred while parsing user data...
                    </>);
                }

            } else {
                setAccountDisplayElem(<>
                    Error occurred while querying user data...
                </>);
            }
        } catch (e) {
            setAccountDisplayElem(<>
                Error occurred while connecting to the server...
            </>);
        } finally {
            e.target.reset();
        }
    }

    return <>
        <button onClick={() => setCount(count + 1)}>Press count: {count}</button>

        <form onSubmit={handleSubmission}>
            <label>
                <div>Username To Find:</div>
                <input type="text" name="username" autoComplete="username"></input>
            </label>

            <button type="submit">Submit</button>
        </form>

        <label>
            Data:
        </label>

        <label>
            {accountDisplayElem}
        </label>
    </>;
}

export function App() {
    return <>
        <div>
            <h1>Welcome to my app~</h1>
            Today is {new Date().toDateString()}
            <Ui/>
        </div>
    </>;
}
