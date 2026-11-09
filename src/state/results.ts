import { createContext, useContext } from "react";
import type { CalcResult } from "../domain/types";

/** Tüm risklerin hesap sonuçları; App içinde bir kez hesaplanıp bileşenlere dağıtılır. */
export const ResultsContext = createContext<Map<string, CalcResult>>(new Map());
export const useResults = () => useContext(ResultsContext);
