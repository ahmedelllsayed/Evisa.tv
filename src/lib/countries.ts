const codes =
  "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(
    " ",
  );

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
const arabicNames = new Intl.DisplayNames(["ar"], { type: "region" });

export type Country = { code: string; name: string };

export const countries: Country[] = codes
  .map((code) => ({ code, name: code === "XK" ? "Kosovo" : (displayNames.of(code) ?? code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function countryName(code: string | null | undefined, locale = "en") {
  if (!code) return "";
  const upper = code.toUpperCase();
  if (upper === "XK") return locale.toLowerCase().startsWith("ar") ? "كوسوفو" : "Kosovo";
  if (locale.toLowerCase().startsWith("ar")) return arabicNames.of(upper) ?? displayNames.of(upper) ?? code;
  return countries.find((c) => c.code === upper)?.name ?? displayNames.of(upper) ?? code;
}

/** Empty `codes` keeps the full list. A saved selection limits the citizenship picker. */
export function citizenshipChoices(codes: string[] | undefined, current?: string) {
  if (!codes?.length) return countries;
  const allowed = new Set(codes.map((code) => code.toUpperCase()));
  if (current) allowed.add(current.toUpperCase());
  return countries.filter((country) => allowed.has(country.code));
}

export function flagUrl(code: string, width: 20 | 40 | 80 = 40) {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}
