use crate::{Building, Design, TrackPoint, HEIGHT, WIDTH};

impl Design {
    pub fn station_bounds(&self) -> Option<(i16, i16, i16, i16)> {
        let a = self.track.first()?;
        let b = self.track.get(1)?;
        if a.z == b.z && (a.x - b.x).abs() == 60 {
            Some((a.x.min(b.x) - 10, a.z - 15, a.x.max(b.x) + 10, a.z + 15))
        } else if a.x == b.x && (a.z - b.z).abs() == 60 {
            Some((a.x - 15, a.z.min(b.z) - 10, a.x + 15, a.z.max(b.z) + 10))
        } else {
            None
        }
    }
    pub fn validate_map_track(&self) -> Result<(), String> {
        if !(4..=256).contains(&self.track.len())
            || self.track_w == 0
            || self.track_h == 0
            || self.track_w > WIDTH as u8
            || self.track_h > HEIGHT as u8
        {
            return Err("Draw a closed loop inside the park, using up to 256 turns.".into());
        }
        let (left, top, right, bottom) = self
            .station_bounds()
            .ok_or("Keep both station connections together.")?;
        if left < 0
            || top < 0
            || right > self.track_w as i16 * 10
            || bottom > self.track_h as i16 * 10
            || left % 10 != 0
            || top % 10 != 0
            || self.track[0].y != 12
            || self.track[1].y != 12
        {
            return Err("Keep the station inside the park and at boarding height.".into());
        }
        for (i, p) in self.track.iter().enumerate() {
            if p.x < 4
                || p.z < 4
                || p.x > self.track_w as i16 * 10 - 4
                || p.z > self.track_h as i16 * 10 - 4
                || !(12..=600).contains(&p.y)
            {
                return Err(
                    "Keep the track inside the park and between 1.2 and 60 metres high.".into(),
                );
            }
            let q = &self.track[(i + 1) % self.track.len()];
            if (p.x as i32 - q.x as i32).pow(2) + (p.z as i32 - q.z as i32).pow(2) < 25 {
                return Err("Leave half a tile between neighbouring turns.".into());
            }
        }
        Ok(())
    }
}

// Integer Hermite sampling matches the renderer's Catmull–Rom tension of 0.25.
// A narrow corridor reserves the rails. Elevated sections leave walking paths clear.
fn sample(p0: i16, p1: i16, p2: i16, p3: i16, k: i64, n: i64) -> i64 {
    let (a, b, c, d) = (p0 as i64, p1 as i64, p2 as i64, p3 as i64);
    4 * b * n.pow(3)
        + (c - a) * k * n.pow(2)
        + (-12 * b + 12 * c - 2 * (c - a) - (d - b)) * k.pow(2) * n
        + (8 * b - 8 * c + (c - a) + (d - b)) * k.pow(3)
}
impl Building {
    pub fn occupied_cells(&self, for_paths: bool) -> Vec<u16> {
        let (w, h) = self.footprint();
        if !self.design.map_track || self.kind != "coaster" {
            return (self.z as u16..self.z as u16 + h as u16)
                .flat_map(|z| (self.x as u16..self.x as u16 + w as u16).map(move |x| z * WIDTH + x))
                .collect();
        }
        let mut occupied = vec![false; (WIDTH * HEIGHT) as usize];
        let mut mark = |x: i16, z: i16| {
            let x = x + self.x as i16;
            let z = z + self.z as i16;
            if x >= 0 && z >= 0 && x < WIDTH as i16 && z < HEIGHT as i16 {
                occupied[(z as u16 * WIDTH + x as u16) as usize] = true;
            }
        };
        if let Some((left, top, right, bottom)) = self.design.station_bounds() {
            for z in top / 10..bottom / 10 {
                for x in left / 10..right / 10 {
                    mark(x, z);
                }
            }
        }
        let points = &self.design.track;
        for i in 0..points.len() {
            let p0 = &points[(i + points.len() - 1) % points.len()];
            let p1 = &points[i];
            let p2 = &points[(i + 1) % points.len()];
            let p3 = &points[(i + 2) % points.len()];
            let n = ((p1.x - p2.x).abs() as i64 + (p1.z - p2.z).abs() as i64)
                .div_euclid(3)
                .max(8);
            let denominator = 4 * n.pow(3);
            for k in 0..=n {
                let axis = |f: fn(&TrackPoint) -> i16| {
                    if i == 0 {
                        (f(p1) as i64 * (n - k) + f(p2) as i64 * k) * 4 * n.pow(2)
                    } else {
                        sample(f(p0), f(p1), f(p2), f(p3), k, n)
                    }
                };
                let y = axis(|p| p.y as i16).clamp(12 * denominator, 600 * denominator);
                if for_paths && y >= 25 * denominator {
                    continue;
                }
                let x = axis(|p| p.x).clamp(4 * denominator, (w as i64 * 10 - 4) * denominator);
                let z = axis(|p| p.z).clamp(4 * denominator, (h as i64 * 10 - 4) * denominator);
                for dx in [-3i64, 0, 3] {
                    for dz in [-3i64, 0, 3] {
                        mark(
                            (x + dx * denominator).div_euclid(10 * denominator) as i16,
                            (z + dz * denominator).div_euclid(10 * denominator) as i16,
                        );
                    }
                }
            }
        }
        occupied
            .iter()
            .enumerate()
            .filter_map(|(i, used)| used.then_some(i as u16))
            .collect()
    }
    pub fn map_entry(&self) -> Option<u16> {
        let (left, top, right, bottom) = self.design.station_bounds()?;
        let a = &self.design.track[0];
        let b = &self.design.track[1];
        let (x, z) = if b.x > a.x {
            ((a.x + b.x) / 20, bottom / 10)
        } else if b.x < a.x {
            ((a.x + b.x) / 20, top / 10 - 1)
        } else if b.z > a.z {
            (left / 10 - 1, (a.z + b.z) / 20)
        } else {
            (right / 10, (a.z + b.z) / 20)
        };
        let (x, z) = (x + self.x as i16, z + self.z as i16);
        (x >= 0 && z >= 0 && x < WIDTH as i16 && z < HEIGHT as i16)
            .then_some(z as u16 * WIDTH + x as u16)
    }
}
