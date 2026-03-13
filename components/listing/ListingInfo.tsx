"use client";

import useCountries from "@/hook/useCountries";
import { SafeUser } from "@/types";
import dynamic from "next/dynamic";
import React from "react";
import { IconType } from "react-icons";
import { AgibotScenarioDetails } from "@/lib/agibotScenarioDetails";
import Avatar from "../Avatar";
import ListingCategory from "./ListingCategory";
import Sleep from "../Sleep";
import Offers from "../Offers";

const Map = dynamic(() => import("../Map"), {
  ssr: false,
});

type Props = {
  user: SafeUser;
  description: string;
  guestCount: number;
  roomCount: number;
  bathroomCount: number;
  category:
    | {
        icon: IconType;
        label: string;
        description: string;
      }
    | undefined;
  locationValue: string;
  agibotScenario?: AgibotScenarioDetails | null;
};

function ListingInfo({
  user,
  description,
  guestCount,
  roomCount,
  bathroomCount,
  category,
  locationValue,
  agibotScenario,
}: Props) {
  const { getByValue } = useCountries();
  const location = getByValue(locationValue);
  const coordinates = location?.latlng;
  const flagCode = locationValue?.length === 2 ? locationValue : "US";

  return (
    <div className="col-span-4 flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className=" text-xl font-semibold flex flex-row items-center gap-2">
          <div>Operated by {user?.name}</div>
          <Avatar src={user?.image} userName={user?.name} />
        </div>
        <div className="flex flex-row items-center gap-4 font-light text-neutral-500">
          <p>{guestCount} customers</p>
          <p>{roomCount} service units</p>
          <p>{bathroomCount} coverage zones</p>
        </div>
      </div>
      <hr />
      {category && (
        <ListingCategory
          icon={category.icon}
          label={category?.label}
          description={category?.description}
        />
      )}
      <hr />
      <div className="flex flex-col">
        <p className="text-4xl font-bold text-robotx">
          RobotX <span className="text-black">Service Assurance</span>
        </p>
        <p className="text-neutral-500 pt-3">
          Every booking includes support coverage for schedule changes,
          service delivery issues, and deployment coordination.
        </p>
        <p className="text-black font-bold underline pt-3 cursor-pointer">
          Learn more
        </p>
      </div>
      <hr />
      {agibotScenario ? (
        <div className="flex flex-col gap-4">
          <p className="text-lg font-light text-neutral-500">
            {agibotScenario.overview}
          </p>
          <p className="text-xl font-semibold">Service package details</p>

          <div className="hidden overflow-hidden rounded-xl border border-neutral-200 md:block">
            <table className="w-full text-left">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-neutral-700">
                    Package
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-neutral-700">
                    Robot model
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-neutral-700">
                    Service window
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-neutral-700">
                    Included features
                  </th>
                </tr>
              </thead>
              <tbody>
                {agibotScenario.rows.map((row) => (
                  <tr key={row.tierLabel} className="border-t border-neutral-200">
                    <td className="px-4 py-4 text-sm font-semibold text-black">
                      {row.tierLabel}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      {row.robot}
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      {row.hours}h
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-700">
                      <ul className="list-disc space-y-1 pl-5">
                        {row.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {agibotScenario.rows.map((row) => (
              <div
                key={row.tierLabel}
                className="rounded-xl border border-neutral-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-black">
                    {row.tierLabel}
                  </p>
                  <p className="text-sm font-medium text-neutral-700">
                    {row.hours}h
                  </p>
                </div>
                <p className="mt-1 text-sm text-neutral-600">{row.robot}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                  {row.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-lg font-light text-neutral-500">{description}</p>
      )}
      <hr />
      <Sleep />
      <hr />
      <Offers />
      <hr />
      <p className="text-xl font-semibold">{`Service coverage area`}</p>
      <Map center={coordinates} locationValue={locationValue} flagCode={flagCode} />
    </div>
  );
}

export default ListingInfo;
