import React from "react";

import {Redirect} from "@docusaurus/router";
import useBaseUrl from "@docusaurus/useBaseUrl";

function Home() {
	return <Redirect to={useBaseUrl("/getting_started/Introduction")} />;
}

export default Home;
