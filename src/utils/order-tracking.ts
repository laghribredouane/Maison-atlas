import { OrderRecord } from '../types/marketplace';

export interface TrackingMilestone {
  id: string;
  title: string;
  location: string;
  timestamp: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface TrackingDetails {
  trackingNumber: string;
  orderNumber: string;
  carrierName: string;
  carrierContact: string;
  currentStatusLabel: string;
  currentStatusDescription: string;
  currentLocation: string;
  destinationCity: string;
  destinationAddress: string;
  estimatedDeliveryDate: string;
  isDelivered: boolean;
  totalCodAmountMad: number;
  milestones: TrackingMilestone[];
}

/**
 * Derives a consistent carrier name based on the shipping method
 */
export function getCarrierInfo(shippingMethodName?: string) {
  const method = (shippingMethodName || '').toLowerCase();
  if (method.includes('express') || method.includes('livraison')) {
    return {
      carrierName: 'Amana Express Logistique (Poste Maroc)',
      carrierContact: '+212 5 37 21 02 02 · contact@amana.ma',
    };
  }
  return {
    carrierName: 'Atlas Courrier & Fret Rapide',
    carrierContact: '+212 5 22 40 50 60 · support@atlas-logistics.ma',
  };
}

/**
 * Builds realistic, chronological tracking milestones and current status for any order.
 */
export function getOrderTrackingDetails(order: OrderRecord): TrackingDetails {
  const trackingNumber =
    order.trackingNumber && order.trackingNumber.trim()
      ? order.trackingNumber
      : `ATLAS-TRK-${order.orderNumber.replace(/[^A-Z0-9]/gi, '')}`;

  const { carrierName, carrierContact } = getCarrierInfo(order.shippingMethodName);
  const city = order.shippingCity || 'Casablanca';

  const baseDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const formatStepDate = (offsetHours: number) => {
    const d = new Date(baseDate.getTime() + offsetHours * 3600 * 1000);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const status = (order.orderStatus || 'confirmed').toLowerCase();

  let activeStep = 1; // 1: confirmed, 2: preparing, 3: in transit hub, 4: out for delivery, 5: delivered
  if (status === 'preparing') activeStep = 2;
  else if (status === 'shipped') activeStep = 4;
  else if (status === 'delivered') activeStep = 5;
  else if (status === 'cancelled') activeStep = 0;

  const rawMilestones = [
    {
      id: 'step-1',
      stepNum: 1,
      title: 'Commande validée & bordereau COD émis',
      location: 'Plateforme Centrale Maison Atlas',
      timestamp: formatStepDate(0),
      description: 'Validation de commande en mode Paiement à la Livraison (COD). Bordereau transporteur généré.',
    },
    {
      id: 'step-2',
      stepNum: 2,
      title: 'Préparation & contrôle qualité en atelier',
      location: 'Atelier de fabrication partenaire',
      timestamp: formatStepDate(12),
      description: 'Vérification manuelle, conditionnement renforcé pour transport et étiquetage logistique.',
    },
    {
      id: 'step-3',
      stepNum: 3,
      title: 'Prise en charge au Hub Régional Transporteur',
      location: 'Centre de tri Amana / Atlas Logistique (Casablanca Nord)',
      timestamp: formatStepDate(28),
      description: 'Colis scanné et trié pour acheminement vers le centre de distribution régional.',
    },
    {
      id: 'step-4',
      stepNum: 4,
      title: 'En cours de distribution vers votre adresse',
      location: `Agence de distribution locale (${city})`,
      timestamp: formatStepDate(44),
      description: `Le coursier a pris en charge le colis pour livraison à ${order.shippingAddress}, ${city}.`,
    },
    {
      id: 'step-5',
      stepNum: 5,
      title: 'Colis livré & Paiement COD encaissé',
      location: `${order.shippingAddress}, ${city}`,
      timestamp: formatStepDate(48),
      description: 'Remise en main propre contre règlement du montant dû en espèces.',
    },
  ];

  const milestones: TrackingMilestone[] = rawMilestones.map((m) => {
    let milestoneStatus: 'completed' | 'current' | 'upcoming' = 'upcoming';
    if (m.stepNum < activeStep) {
      milestoneStatus = 'completed';
    } else if (m.stepNum === activeStep) {
      milestoneStatus = 'current';
    } else {
      milestoneStatus = 'upcoming';
    }

    return {
      id: m.id,
      title: m.title,
      location: m.location,
      timestamp: m.timestamp,
      description: m.description,
      status: milestoneStatus,
    };
  });

  let currentStatusLabel = 'En préparation chez l’artisan';
  let currentStatusDescription = 'L’atelier partenaire prépare soigneusement vos pièces avant expédition.';
  let currentLocation = 'Atelier partenaire';

  if (activeStep === 1) {
    currentStatusLabel = 'Commande validée (Bordereau créé)';
    currentStatusDescription = 'Votre commande a été confirmée. Le bordereau de livraison COD est prêt.';
    currentLocation = 'Plateforme Maison Atlas';
  } else if (activeStep === 2) {
    currentStatusLabel = 'Préparation en cours';
    currentStatusDescription = 'Les artisans vérifient la conformité de vos articles et emballent le colis.';
    currentLocation = 'Atelier artisan';
  } else if (activeStep === 3) {
    currentStatusLabel = 'En transit au Hub régional';
    currentStatusDescription = 'Le colis est arrivé au centre de tri principal et se dirige vers votre ville.';
    currentLocation = 'Hub Logistique Casablanca';
  } else if (activeStep === 4) {
    currentStatusLabel = 'En cours de livraison locale';
    currentStatusDescription = `Le livreur est en route pour vous remettre le colis à ${city}.`;
    currentLocation = `En tournée à ${city}`;
  } else if (activeStep === 5) {
    currentStatusLabel = 'Colis livré avec succès';
    currentStatusDescription = 'La commande a été remise au destinataire et le règlement COD a été effectué.';
    currentLocation = `${city} (Remis au client)`;
  } else if (status === 'cancelled') {
    currentStatusLabel = 'Commande annulée';
    currentStatusDescription = 'Cette commande a été annulée. L’expédition n’a pas eu lieu.';
    currentLocation = 'Annulée';
  }

  // Estimated delivery
  const estDelivery = new Date(baseDate.getTime() + 48 * 3600 * 1000);
  const estimatedDeliveryDate = estDelivery.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    trackingNumber,
    orderNumber: order.orderNumber,
    carrierName,
    carrierContact,
    currentStatusLabel,
    currentStatusDescription,
    currentLocation,
    destinationCity: city,
    destinationAddress: order.shippingAddress || city,
    estimatedDeliveryDate,
    isDelivered: activeStep === 5,
    totalCodAmountMad: Number(order.totalMad) || 0,
    milestones,
  };
}
