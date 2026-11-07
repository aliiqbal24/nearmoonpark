//! The three merchant offers, their finite funding, and settlement rules.
use crate::Run;
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Partnership {
    pub id: u8,
    pub owner: String,
    pub kind: String,
    pub title: String,
    pub target: u16,
    pub investment: i64,
    pub reward: i64,
    pub available_at: u16,
    pub duration: u16,
    pub status: String,
    pub building: Option<u32>,
    pub baseline: u32,
    pub progress: u16,
    pub deadline: u16,
    pub settled_at: Option<u16>,
    pub share_percent: u8,
    pub earned: i64,
}
pub fn offers() -> Vec<Partnership> {
    [
        ("Omar", "food", "The first lunch rush", 8, 18000, 0, 160),
        ("Mina", "drink", "A cooler kind of Moon", 8, 20000, 70, 140),
        ("Nia", "depot", "Keep the dream running", 1, 22000, 180, 170),
    ]
    .into_iter()
    .enumerate()
    .map(
        |(i, (owner, kind, title, target, reward, available_at, duration))| Partnership {
            id: i as u8 + 1,
            owner: owner.into(),
            kind: kind.into(),
            title: title.into(),
            target,
            investment: 10000,
            reward,
            available_at,
            duration,
            status: "offered".into(),
            building: None,
            baseline: 0,
            progress: 0,
            deadline: 0,
            settled_at: None,
            share_percent: 20,
            earned: 0,
        },
    )
    .collect()
}
impl Run {
    pub(crate) fn accept_partnership(&mut self, id: i64, building: u32) -> Result<(), String> {
        let index = self
            .partnerships
            .iter()
            .position(|p| p.id as i64 == id)
            .ok_or("Partnership not found.")?;
        let p = self.partnerships[index].clone();
        if p.status != "offered" || self.tick < p.available_at || self.tick > crate::END - 45 {
            return Err("This offer is not available now.".into());
        }
        if self.partnerships.iter().any(|p| p.status == "active") {
            return Err("Finish your current partnership first.".into());
        }
        let b = self
            .buildings
            .iter()
            .position(|b| b.id == building && b.kind == p.kind && !b.sold)
            .ok_or("Build this merchant's business before partnering.")?;
        if self.cash < p.investment || self.grant_cash < p.reward {
            return Err("Not enough working capital or grant funding.".into());
        }
        self.cash -= p.investment;
        self.buildings[b].cash += p.investment;
        self.buildings[b].insolvent = false;
        self.buildings[b].rent = p.share_percent;
        self.grant_cash -= p.reward;
        self.grant_escrow += p.reward;
        let deal = &mut self.partnerships[index];
        deal.status = "active".into();
        deal.building = Some(building);
        deal.baseline = self.buildings[b].served;
        deal.deadline = (self.tick + p.duration).min(crate::END);
        self.trade(
            "Park",
            format!("business:{building}"),
            p.investment,
            "partnership capital",
            1,
        );
        self.event(format!(
            "Partnered with {}. {} credits reserved by the Lunar Tourism Board.",
            p.owner,
            p.reward / 100
        ));
        Ok(())
    }
    pub(crate) fn settle_partnerships(&mut self) {
        for i in 0..self.partnerships.len() {
            if self.partnerships[i].status != "active" {
                continue;
            }
            let b = self
                .buildings
                .iter()
                .find(|b| Some(b.id) == self.partnerships[i].building && !b.sold);
            let progress = b
                .map(|b| b.served.saturating_sub(self.partnerships[i].baseline))
                .unwrap_or(0);
            self.partnerships[i].progress = progress.min(self.partnerships[i].target as u32) as u16;
            let p = self.partnerships[i].clone();
            if progress >= p.target as u32 && self.tick <= p.deadline {
                self.grant_escrow -= p.reward;
                self.cash += p.reward;
                self.partnerships[i].status = "completed".into();
                self.partnerships[i].settled_at = Some(self.tick);
                self.trade(
                    "Lunar Tourism Board",
                    "Park",
                    p.reward,
                    "partnership reward",
                    1,
                );
                self.event(format!(
                    "{} delivered! Partnership complete: +{} credits.",
                    p.owner,
                    p.reward / 100
                ));
            } else if self.tick >= p.deadline || b.is_none() {
                self.grant_escrow -= p.reward;
                self.grant_cash += p.reward;
                self.partnerships[i].status = "expired".into();
                self.partnerships[i].settled_at = Some(self.tick);
                self.event(format!("{}'s partnership ended. Unclaimed grant returned; the business keeps its working capital.", p.owner));
            }
        }
    }
}
