import HorseForm from "../HorseForm";
import { createHorse } from "../actions";
export default function NewHorsePage() {
  return (<div className="space-y-4"><h1 className="text-xl font-bold">Add horse</h1><HorseForm action={createHorse} /></div>);
}
