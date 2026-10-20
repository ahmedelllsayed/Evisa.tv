export type ReservationServices = {
  flight: boolean;
  hotel: boolean;
  itinerary: boolean;
  insurance: boolean;
};

export type ReservationFees = {
  flight: number;
  hotel: number;
  itinerary: number;
  insurance: number;
};

export function reservationTotal(services: ReservationServices, fees: ReservationFees) {
  return (
    (services.flight ? fees.flight : 0) +
    (services.hotel ? fees.hotel : 0) +
    (services.itinerary ? fees.itinerary : 0) +
    (services.insurance ? fees.insurance : 0)
  );
}

export function selectedServiceCount(services: ReservationServices) {
  return Number(services.flight) + Number(services.hotel) + Number(services.itinerary) + Number(services.insurance);
}

/** Paymob orders for this product use a reference that starts with TR-. */
export function isTravelMerchantOrder(merchantOrderId: string) {
  return merchantOrderId.startsWith("TR-");
}

/** Booking and file generation run only after a successful payment, or when staff retry a failed one. */
export function canStartTravelFulfillment(status: string) {
  return status === "paid" || status === "needs_attention";
}
