"use client";

import { useState } from "react";
import EmergencyCommand from "./emergency-command";
import RegionalAccess from "./regional-access";

type Product = "emergency" | "regional";

export default function Home() {
  const [product, setProduct] = useState<Product>("emergency");
  if (product === "regional") {
    return <RegionalAccess onSwitchToEmergency={() => setProduct("emergency")} />;
  }
  return <EmergencyCommand onSwitchToRegional={() => setProduct("regional")} />;
}
