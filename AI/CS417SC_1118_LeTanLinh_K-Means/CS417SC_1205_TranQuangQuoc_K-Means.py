import math

def distance_squared(p, c):
    """Ham tinh binh phuong khoang cach giua 2 diem"""
    return (p[0] - c[0])**2 + (p[1] - c[1])**2

def assign_points(P, C):
    """Gan moi diem P cho diem C gan nhat"""
    result = []
    for p in P:
        min_dist = float('inf')
        min_index = -1
        for j, c in enumerate(C):
            d = distance_squared(p, c)
            if d < min_dist:
                min_dist = d
                min_index = j
        result.append(min_index)
    return result

def update_centers(P, result, num_c, old_C):
    """Cap nhat lai vi tri cac diem C"""
    new_C = []
    for j in range(num_c):
        assigned_points = [P[i] for i in range(len(P)) if result[i] == j]
        if assigned_points:
            avg_x = sum(p[0] for p in assigned_points) / len(assigned_points)
            avg_y = sum(p[1] for p in assigned_points) / len(assigned_points)
            new_C.append((avg_x, avg_y))
        else:
            new_C.append(old_C[j])  
    return new_C

def has_converged(old_C, new_C, epsilon=0.01):
    """Kiem tra xem cac diem C co thay doi hay khong"""
    for a, b in zip(old_C, new_C):
        if abs(a[0] - b[0]) > epsilon or abs(a[1] - b[1]) > epsilon:
            return False
    return True

def InputData():
    print("Chuong trinh K-means\n")
    filename = "D:\DTU2025\CDIO3\AI\data.txt"    
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            lines = file.readlines()
            
            # Đọc số lượng điểm P và C
            num_p = int(lines[0].strip())
            num_c = int(lines[1].strip())
            
            # Đọc tọa độ các điểm P
            P = []
            for i in range(2, 2 + num_p):
                x, y = map(float, lines[i].strip().split())
                P.append((x, y))
            
            # Đọc tọa độ các điểm C
            C = []
            for i in range(2 + num_p, 2 + num_p + num_c):
                x, y = map(float, lines[i].strip().split())
                C.append((x, y))
            
            print(f"Đã đọc {num_p} điểm P và {num_c} điểm C từ file {filename}")
            return P, C, num_p, num_c
            
    except FileNotFoundError:
        print(f"Không tìm thấy file {filename}")
        return None, None, 0, 0
    except Exception as e:
        print(f"Lỗi khi đọc file: {e}")
        return None, None, 0, 0
    
# Hiển thị dữ liệu ban đầu
def DisplayInitialData(P, C):
    print("\nCác điểm P:")
    for i, p in enumerate(P):
        print(f"P{i+1} = ({p[0]}, {p[1]})")
    print("\nCác điểm C ban đầu:")
    for i, c in enumerate(C):
        print(f"C{i+1} = ({c[0]}, {c[1]})")

#Thực hiện thuật toán K-Means
def KMeansClustering(P, C, num_c):
    iteration = 1
    while True:
        print(f"\n Lần lặp {iteration} ")
        
        # Gán P → C
        result = assign_points(P, C)

        # In kết quả ánh xạ
        print("Kết quả ánh xạ P -> C:")
        for i, c_index in enumerate(result):
            print(f"P{i+1} -> C{c_index + 1}")

        # Cập nhật lại vị trí các C
        new_C = update_centers(P, result, num_c, C)

        # In lại vị trí mới của các điểm C
        print("Toạ độ mới của các điểm C:")
        for j, c in enumerate(new_C):
            print(f"C{j+1} = ({c[0]:.3f}, {c[1]:.3f})")

        # Kiểm tra hội tụ
        if has_converged(C, new_C):
            print("\nCác điểm C không còn thay đổi. Kết thúc.")
            break

        # Cập nhật C và tiếp tục vòng lặp
        C = new_C
        iteration += 1
    
    return C, result

def main():
    P, C, num_p, num_c = InputData()
    
    if P is None or C is None:
        print("Không thể đọc dữ liệu từ file. Chương trình kết thúc.")
        return
    
    DisplayInitialData(P, C)
    final_centers, final_assignment = KMeansClustering(P, C, num_c)
    
    print("\nKết quả")
    print("Tâm cụm cuối cùng:")
    for i, center in enumerate(final_centers):
        print(f"C{i+1} = ({center[0]:.3f}, {center[1]:.3f})")
    
if __name__ == "__main__":
    main()

"""
"data.txt"
10
2
1.0 1.0
1.5 1.2
2.0 1.8
2.2 2.1
1.8 1.5
7.0 8.0
7.5 8.2
8.0 7.5
8.3 8.1
7.8 7.9
4.0 4.0
6.0 6.0
"""