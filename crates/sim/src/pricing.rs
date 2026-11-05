//! Inventory-driven quotes. Every quote has a cost floor and a 15% per-sol movement bound.
pub fn quote(old: i64, stock: i64, target: i64, floor: i64, ceiling: i64) -> i64 {
    let percentage = if stock < target / 2 {
        115
    } else if stock > target {
        85
    } else {
        100
    };
    (old * percentage / 100).clamp(floor, ceiling)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn scarcity_and_glut_move_prices() {
        assert!(quote(10, 0, 100, 2, 30) > 10);
        assert!(quote(10, 200, 100, 2, 30) < 10);
        assert_eq!(quote(10, 75, 100, 2, 30), 10)
    }
    #[test]
    fn floors_and_ceilings_hold() {
        assert_eq!(quote(3, 200, 100, 3, 30), 3);
        assert_eq!(quote(30, 0, 100, 3, 30), 30)
    }
}
